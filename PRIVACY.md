# Privacy policy

*Last updated: November 6, 2026*

Kill Switch for Firefox VPN doesn't collect, store, sell or send any personal data or usage data. It has no analytics, no telemetry and no remote servers.

## What it stores on your device

- Whether the kill switch is on or off, in the extension's local storage.
- In memory only, cleared when Firefox closes: how many requests were blocked and when the VPN was last used, so the popup can show them.

## Why it needs its permissions

| Permission | Why |
|---|---|
| Access your data for all websites, `proxy` | To decide, for every request, whether it may leave without the VPN. The extension reads only the request's address; it doesn't read or change page content. |
| `webRequest` | To notice a blocked page and show an explanation instead of a network error, and to detect that the VPN is in use. |
| `privacy` | To turn off WebRTC traffic outside the proxy and DNS prefetching while the kill switch is on, and to restore them when it's off. |
| `tabs` | To open the welcome page and show the blocked page in the tab that was blocked. |
| `storage` | To remember whether the kill switch is on. |

## Contact

Questions: open an issue at https://github.com/agsola/firefox-vpn-kill-switch/issues.

---

# Política de privacidad

*Última actualización: 6 de noviembre de 2026*

Kill Switch for Firefox VPN no recoge, guarda, vende ni envía ningún dato personal ni de uso. No tiene analíticas, telemetría ni servidores remotos.

## Qué guarda en tu dispositivo

- Si el kill switch está activado o desactivado, en el almacenamiento local de la extensión.
- Solo en memoria, y se borra al cerrar Firefox: cuántas peticiones se han bloqueado y cuándo se usó la VPN por última vez, para mostrarlo en el popup.

## Por qué necesita sus permisos

| Permiso | Por qué |
|---|---|
| Acceder a tus datos de todos los sitios web, `proxy` | Para decidir, en cada petición, si puede salir sin VPN. La extensión solo lee la dirección de la petición; no lee ni modifica el contenido de las páginas. |
| `webRequest` | Para detectar una página bloqueada y mostrar una explicación en lugar de un error de red, y para saber que la VPN está en uso. |
| `privacy` | Para desactivar el tráfico WebRTC que no pasa por el proxy y el prefetch de DNS mientras el kill switch está activado, y restaurarlos al desactivarlo. |
| `tabs` | Para abrir la página de bienvenida y mostrar la página de bloqueo en la pestaña bloqueada. |
| `storage` | Para recordar si el kill switch está activado. |

## Contacto

Dudas: abre un issue en https://github.com/agsola/firefox-vpn-kill-switch/issues.
