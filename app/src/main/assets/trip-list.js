"use strict";
// Un desplazamiento revela la acción; solo el botón explícito elimina el viaje.
window.TripSwipe = (() => {
  const width = 80;
  let openRow = null;
  function close() {
    if (openRow) {
      openRow.style.setProperty("--swipe-offset", "0px");
      openRow.classList.remove("is-open");
      openRow = null;
    }
  }
  function reveal(row, open) {
    if (open) {
      if (openRow !== row) close();
      openRow = row;
    } else if (openRow === row) openRow = null;
    row.style.setProperty("--swipe-offset", open ? -width + "px" : "0px");
    row.classList.toggle("is-open", open);
  }
  function enhance(card, { trip, featured = false, onDelete }) {
    const row = document.createElement("div");
    row.className = "trip-swipe" + (featured ? " is-featured" : "");
    row.dataset.tripId = trip.id;
    const front = document.createElement("div");
    front.className = "trip-front";
    const remove = document.createElement("button");
    remove.className = "trip-delete";
    remove.type = "button";
    remove.setAttribute("aria-label", "Borrar viaje: " + trip.name);
    remove.innerHTML =
      '<svg class="app-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg><span>Borrar</span>';
    remove.addEventListener("focus", () => reveal(row, true));
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      onDelete(trip.id);
    });
    card.setAttribute(
      "aria-description",
      "Desliza a la izquierda o pulsa flecha izquierda para mostrar Borrar.",
    );
    card.before(row);
    front.append(card);
    row.append(front, remove);
    let gesture = null,
      suppressUntil = 0;
    front.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      gesture = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        base: row.classList.contains("is-open") ? -width : 0,
        offset: 0,
        horizontal: false,
        vertical: false,
      };
    });
    front.addEventListener("pointermove", (event) => {
      if (!gesture || gesture.id !== event.pointerId || gesture.vertical) return;
      const dx = event.clientX - gesture.x,
        dy = event.clientY - gesture.y;
      if (!gesture.horizontal) {
        if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
          gesture.vertical = true;
          return;
        }
        if (Math.abs(dx) <= 10 || Math.abs(dx) <= Math.abs(dy)) return;
        gesture.horizontal = true;
        if (openRow !== row) close();
        front.setPointerCapture(event.pointerId);
        row.classList.add("is-dragging");
      }
      event.preventDefault();
      gesture.offset = Math.max(-width, Math.min(0, gesture.base + dx));
      row.style.setProperty("--swipe-offset", gesture.offset + "px");
    });
    function finish(event) {
      if (!gesture || gesture.id !== event.pointerId) return;
      if (gesture.horizontal) {
        row.classList.remove("is-dragging");
        reveal(
          row,
          event.type === "pointercancel" ? gesture.base < 0 : gesture.offset < -width * 0.45,
        );
        suppressUntil = Date.now() + 400;
      }
      gesture = null;
    }
    front.addEventListener("pointerup", finish);
    front.addEventListener("pointercancel", finish);
    front.addEventListener(
      "click",
      (event) => {
        if (Date.now() < suppressUntil || row.classList.contains("is-open")) {
          event.preventDefault();
          event.stopPropagation();
          if (Date.now() >= suppressUntil) reveal(row, false);
        }
      },
      true,
    );
    card.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "Delete") {
        event.preventDefault();
        event.stopPropagation();
        reveal(row, true);
        remove.focus({ preventScroll: true });
      } else if (event.key === "Escape" || event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        reveal(row, false);
      }
    });
    remove.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        card.focus({ preventScroll: true });
        reveal(row, false);
      }
    });
    return row;
  }
  document.addEventListener(
    "click",
    (event) => {
      if (openRow && !openRow.contains(event.target)) close();
    },
    true,
  );
  return { enhance, close };
})();
