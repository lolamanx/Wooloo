# Wooloo · Bitácora de decisiones

| Fecha / etapa | Decisión y opciones | Motivo, resultado y límite |
| --- | --- | --- |
| Hito 1 · Prototipo | Itinerario navegable con almacenamiento local. | Permitió comprobar el flujo de usuario y los campos del viaje. Los datos de esa variante quedaban en el dispositivo. |
| 21 nov. 2026 · Hito 2 | Monolito Express con SQLite. Se consideraron un motor separado y una arquitectura distribuida. | El equipo de dos integrantes priorizó instalación local y operación de un proceso. El servicio quedó organizado en controlador, negocio y repositorio. |
| 21–22 nov. 2026 · Integración | Variante Android debug con puente HTTP local. Se probaron emulador y Samsung por ADB. | El parpadeo del emulador hizo preferible el teléfono físico para la exposición. ADB reverse conectó el teléfono al PC y scrcpy permitió proyectar la pantalla. La variante release conservó guardado local. |
| 22 nov. 2026 · Consulta | Consulta asíncrona de Mis viajes con carga, vacío, error y reintento. | Una conexión fallida debía quedar diferenciada de una lista vacía. Se comprobó la recuperación y la consulta inicial en el Samsung. |
| 22 nov. 2026 · Guardado | Guardado asíncrono, validación visible y conservación de campos. Se evitó cambiar el ID en un reintento del mismo borrador. | Un fallo al guardar deja al usuario en el formulario. La prueba en el Samsung recuperó el guardado tras restablecer ADB. La prueba simulada verificó la confirmación tras 409 para el mismo ID y contenido. |
| 22 nov. 2026 · Instalación | Iniciador portable que detecta herramientas, levanta o reutiliza la demo e instala el APK incluido. | Se reportó instalación en otro PC con Windows 11 Pro y Node.js v26.13.0. El recorrido completo del teléfono se verificó en el equipo habitual. |
