# Simulador ERP — Carnet estudiantil

Mock local del endpoint del ERP University, para desarrollar el backend
(`studentmobileappservice`) mientras el ERP real no expone su endpoint.

Devuelve el `CredentialResponse` que tu backend espera, buscando por `email`.
Para un correo desconocido responde `{ "isEnrolled": false }`, simulando a un
estudiante sin matrícula activa.

## Requisitos

Node.js 18+.

## Uso

```bash
cd simulador-erp-carnet
npm install
npm start
```

Queda escuchando en:

```
GET http://localhost:3001/api/student-card/credential?email=<correo>
```

## Pruebas rápidas

```bash
# Estudiante matriculado (dos carreras)
curl "http://localhost:3001/api/student-card/credential?email=mjperalta@est.ucacue.edu.ec"

# Otro estudiante matriculado (una carrera)
curl "http://localhost:3001/api/student-card/credential?email=jatorres@est.ucacue.edu.ec"

# Correo desconocido -> no matriculado
curl "http://localhost:3001/api/student-card/credential?email=noexiste@est.ucacue.edu.ec"
```

## Conectar el backend

En `studentmobileappservice/src/main/resources/application.properties`:

```properties
erp.base-url=http://localhost:3001
erp.student-card-path=/api/student-card/credential
```

## Editar los datos

Los estudiantes viven en `db.json`. Agrega o modifica objetos dentro de
`students`; cada uno usa las claves tal como las envía el ERP real
(`isEnrolled`, `QRtoken`, `careers[]` con `careerName`, `cycleNumber`, etc.).
