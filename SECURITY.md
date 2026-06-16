# Política de seguridad

## Versiones compatibles

Solo la última versión publicada recibe correcciones de seguridad.

## Cómo informar de una vulnerabilidad

Informa de las vulnerabilidades de forma privada al propietario del repositorio. No abras una incidencia pública que contenga tokens de acceso, cabeceras de autenticación, información privada de la cuenta o secretos de prueba de concepto.

## Modelo de seguridad

- La autenticación se delega en el proveedor de GitHub integrado en VS Code.
- Los tokens de acceso solo se usan en memoria y esta extensión nunca los persiste.
- Los datos de caché del perfil y del avatar se almacenan en el almacenamiento global de la extensión de VS Code.
- La webview recibe campos de perfil ya renderizados, nunca el token de acceso.
- El contenido de la webview usa una política de seguridad de contenido restrictiva y texto escapado controlado por el usuario.
