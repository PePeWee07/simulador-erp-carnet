const fs = require("fs");
const path = require("path");
const jsonServer = require("json-server");
const multer = require("multer");

const PORT = 3001;
const CREDENTIAL_PATH = "/api/student-card/credential";
const PHOTO_VALIDATION_PATH = "/api/student-card/validate-photo";
const SUBJECT_ATTENDANCE_PATH = "/api/academic/subject-attendance";
const NOT_ENROLLED_RESPONSE = { isEnrolled: false };

// Cambia a false para probar el caso de foto rechazada.
const PHOTO_IS_VALID = true;

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, "db.json"));
const attendanceRouter = jsonServer.router(path.join(__dirname, "db2.json"));
const middlewares = jsonServer.defaults();
const upload = multer({ storage: multer.memoryStorage() });

const qrBase64 = readBase64File("qrBase64.text");

function readBase64File(fileName) {
	const content = fs.readFileSync(path.join(__dirname, fileName), "utf8");
	return content.replace(/\s/g, "");
}

function findStudentByEmail(email) {
	return router.db
		.get("students")
		.value()
		.find((student) => student.email === email);
}

function findAttendanceByPersonId(personId) {
	return attendanceRouter.db
		.get("subjectAttendance")
		.value()
		.find((record) => record.personId === personId);
}

server.use(middlewares);

server.get(CREDENTIAL_PATH, (request, response) => {
	const student = findStudentByEmail(request.query.email);
	if (!student) {
		return response.json(NOT_ENROLLED_RESPONSE);
	}

	//* con foto por defecto
	// const enrichedStudent = {
	// 	...student,
	// 	picture: student.picture || readBase64File("imgBase64.text"),
	// 	QRtoken: student.QRtoken || qrBase64,
	// };

	//* sin foto por defecto
	const enrichedStudent = {
		...student,
		QRtoken: student.QRtoken || qrBase64,
	};

	return response.json(enrichedStudent);
});

server.post(
	PHOTO_VALIDATION_PATH,
	upload.single("photo"),
	(request, response) => {
		if (!PHOTO_IS_VALID || !request.file) {
			return response.json({ valid: false });
		}

		const email = request.body.email;
		const student = findStudentByEmail(email);
		if (student) {
			student.picture = request.file.buffer.toString("base64");
		}

		return response.json({ valid: true });
	}
);

server.get(SUBJECT_ATTENDANCE_PATH, (request, response) => {
	const record = findAttendanceByPersonId(request.query.personId);
	if (!record) {
		return response
			.status(404)
			.json({ message: "No attendance found for personId" });
	}

	const { personId, ...payload } = record;
	return response.json(payload);
});

server.use(router);

server.listen(PORT, () => {
	console.log(`Simulador ERP -> http://localhost:${PORT}`);
	console.log(`  carnet:     ${CREDENTIAL_PATH}?email=...`);
	console.log(`  asistencia: ${SUBJECT_ATTENDANCE_PATH}?personId=...`);
});
