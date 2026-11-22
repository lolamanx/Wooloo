const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const { chromium } = require("playwright");

const assets = path.resolve(__dirname, "../app/src/main/assets");
const origin = "https://wooloo.test/";

async function openWithAndroidBridge(t) {
  const browser = await chromium.launch({ channel: process.env.WOOLOO_BROWSER_CHANNEL });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 393, height: 800 } });
  await page.route("**/*", async (route) => {
    if (!route.request().url().startsWith(origin)) return route.abort();
    const asset = new URL(route.request().url()).pathname.slice(1) || "index.html";
    return route.fulfill({ path: path.join(assets, asset) });
  });
  await page.addInitScript(() => {
    window.tripListRequests = [];
    window.AndroidDemoTrips = {
      requestAsync(requestId, method, id, body) {
        window.tripListRequests.push({ requestId, method, id, body });
      },
    };
  });
  const answer = (requestIndex, response) =>
    page.evaluate(
      ({ requestIndex, response }) => {
        window.dispatchEvent(
          new CustomEvent("nativeTripResponse", {
            detail: { requestId: window.tripListRequests[requestIndex].requestId, response },
          }),
        );
      },
      { requestIndex, response },
    );

  await page.goto(origin);
  return { page, answer };
}

test("Mis viajes distingue carga, error y vacío, y reintenta sin reiniciar", async (t) => {
  const { page, answer } = await openWithAndroidBridge(t);
  const message = page.locator("#tripListMessage");
  const empty = page.getByText("Aún no tienes viajes.", { exact: false });
  const retry = page.getByRole("button", { name: "Reintentar" });
  const create = page.locator(".home-search");
  assert.match(await message.textContent(), /Cargando/);
  assert.equal(await empty.isVisible(), false);
  assert.equal(await create.isDisabled(), true);

  await answer(0, "");
  await retry.waitFor();
  assert.match(await message.textContent(), /No pudimos cargar/);
  assert.equal(await empty.isVisible(), false);

  await retry.click();
  await page.waitForFunction(() => window.tripListRequests.length === 2);
  await answer(0, JSON.stringify({ success: true, data: [] }));
  assert.match(await message.textContent(), /Cargando/);
  await answer(1, JSON.stringify({ success: true, data: [] }));
  await empty.waitFor();
  assert.equal(await create.isEnabled(), true);

  await page.reload();
  await answer(
    0,
    JSON.stringify({
      success: true,
      data: [
        {
          id: "trip-hito3",
          name: "Ruta al sur guardada",
          destKey: "osorno",
          departureISO: "2026-12-01T12:00:00.000Z",
          stops: [{ key: "chillan", stayMin: 30 }],
        },
      ],
    }),
  );
  await page.getByText("Ruta al sur guardada").waitFor();
  assert.equal(await empty.isVisible(), false);
});

test("El formulario valida, conserva los datos y confirma un reintento sin duplicar el viaje", async (t) => {
  const { page, answer } = await openWithAndroidBridge(t);
  await answer(0, JSON.stringify({ success: true, data: [] }));
  await page.locator(".home-search").click();

  const name = page.locator("#tripNameInput");
  const destination = page.locator("#tripDestSelect");
  const departure = page.locator("#tripDateInput");
  const error = page.locator("#formError");
  const button = page.locator("#saveTripButton");
  await button.click();
  assert.equal(await name.getAttribute("aria-invalid"), "true");
  assert.match(await error.textContent(), /Escribe un nombre/);
  assert.equal(await page.evaluate(() => window.tripListRequests.length), 1);

  await name.fill("Prueba de guardado");
  await destination.selectOption("valdivia");
  await departure.fill("2026-12-01T09:00");
  await button.click();
  await page.getByText("Guardando tu viaje…").waitFor();
  assert.equal(await button.isDisabled(), true);
  await answer(1, "");
  await error.waitFor();
  assert.match(await error.textContent(), /servidor.*Tus datos siguen/);
  assert.equal(await name.inputValue(), "Prueba de guardado");
  assert.equal(await destination.inputValue(), "valdivia");
  assert.equal(await departure.inputValue(), "2026-12-01T09:00");
  assert.equal(await button.isEnabled(), true);

  await button.click();
  await page.waitForFunction(() => window.tripListRequests.length === 3);
  const posts = await page.evaluate(() => window.tripListRequests.slice(1));
  assert.deepEqual(
    posts.map((request) => request.method),
    ["POST", "POST"],
  );
  assert.equal(posts[0].body, posts[1].body);
  const saved = JSON.parse(posts[0].body);
  await answer(2, JSON.stringify({ success: false, error: { code: 409 } }));
  await page.waitForFunction(() => window.tripListRequests.length === 4);
  const confirmation = await page.evaluate(() => window.tripListRequests[3]);
  assert.equal(confirmation.method, "GET");
  assert.equal(confirmation.id, saved.id);
  await answer(3, JSON.stringify({ success: true, data: saved }));
  await page.locator("#view-stops").waitFor();
  assert.equal(await page.evaluate(() => tripsData.length), 1);
});
