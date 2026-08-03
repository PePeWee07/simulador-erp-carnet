const fs = require("fs");
const path = require("path");
const jsonServer = require("json-server");
const multer = require("multer");

const PORT = 3001;
const CREDENTIAL_PATH = "/api/student-card/credential";
const PHOTO_VALIDATION_PATH = "/api/student-card/validate-photo";
const STUDENT_CAREER_PATH = "/api/academic/student-career";
const SUBJECT_ATTENDANCE_PATH = "/api/academic/subject-attendance";
const STUDENT_ACCOUNT_PATH = "/cobranzas/cob-ctacte-alumno";
const NOT_ENROLLED_RESPONSE = { isEnrolled: false };

// Cambia a false para probar el caso de foto rechazada.
const PHOTO_IS_VALID = true;

// Cambia a true para simular cartera vencida (bloquea los modulos con deuda, p. ej. Academico).
const STUDENT_HAS_DEBT = false;
const STUDENT_DEBT_AMOUNT = 125.5;

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, "db.json"));
const academicRouter = jsonServer.router(path.join(__dirname, "db2.json"));
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

function emailFromToken(token) {
	const parts = token.split(".");
	if (parts.length >= 2) {
		try {
			const payload = JSON.parse(
				Buffer.from(parts[1], "base64").toString("utf8")
			);
			if (payload.sub) return payload.sub;
			if (payload.email) return payload.email;
		} catch (error) {
			// no es un JWT decodificable; se intenta el formato legado abajo
		}
	}
	const legacy = token.match(/^faketoken:(.+)$/i);
	return legacy ? legacy[1] : null;
}

function findCareerByEmail(email) {
	const records = academicRouter.db.get("studentCareer").value();
	if (email) {
		const target = String(email).toLowerCase();
		const found = records.find((record) => {
			const recordEmail = record.email || emailFromToken(record.token || "");
			return String(recordEmail || "").toLowerCase() === target;
		});
		if (found) return found;
	}
	// fallback para desarrollo: primer estudiante del db2.json
	return records[0] || null;
}

function findSubjectsByStudentId(studentId) {
	return academicRouter.db
		.get("subjectAttendance")
		.value()
		.find((record) => String(record.alumnoId) === String(studentId));
}

function extractBearerToken(authorizationHeader) {
	if (!authorizationHeader) {
		return null;
	}
	return authorizationHeader.replace(/^Bearer\s+/i, "");
}

server.use(middlewares);

server.get(CREDENTIAL_PATH, (request, response) => {
	const student = findStudentByEmail(request.query.email);
	if (!student) {
		return response.json(NOT_ENROLLED_RESPONSE);
	}

	//* con foto por defecto
	const enrichedStudent = {
		...student,
		picture: student.picture || readBase64File("imgBase64.text"),
		QRtoken: student.QRtoken || qrBase64,
	};

	//* sin foto por defecto
	// const enrichedStudent = {
	// 	...student,
	// 	QRtoken: student.QRtoken || qrBase64,
	// };

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

server.get(STUDENT_CAREER_PATH, (request, response) => {
	const token = extractBearerToken(request.headers.authorization);
	if (!token) {
		return response.status(401).json({ message: "Missing bearer token" });
	}

	const record = findCareerByEmail(emailFromToken(token));
	if (!record) {
		return response
			.status(404)
			.json({ message: "No careers found for token" });
	}

	return response.json(record.careers);
});

server.get(SUBJECT_ATTENDANCE_PATH, (request, response) => {
	const token = extractBearerToken(request.headers.authorization);
	if (!token) {
		return response.status(401).json({ message: "Missing bearer token" });
	}

	const record = findSubjectsByStudentId(request.query.alumnoId);
	if (!record) {
		return response
			.status(404)
			.json({ message: "No subjects found for alumnoId" });
	}

	return response.json(record.subjects);
});

server.get(STUDENT_ACCOUNT_PATH, (request, response) => {
	const token = extractBearerToken(request.headers.authorization);
	if (!token) {
		return response.status(401).json({ message: "Missing bearer token" });
	}

	const saldo = STUDENT_HAS_DEBT ? STUDENT_DEBT_AMOUNT : 0;
	return response.json({ saldo });
});

server.use(router);

server.listen(PORT, () => {
	console.log(`Simulador ERP -> http://localhost:${PORT}`);
	console.log(`  carnet:     ${CREDENTIAL_PATH}?email=...`);
	console.log(`  carreras:   ${STUDENT_CAREER_PATH}  (header Authorization: Bearer <token>)`);
	console.log(`  materias:   ${SUBJECT_ATTENDANCE_PATH}?alumnoId=...  (header Authorization: Bearer <token>)`);
	console.log(`  estado cta: ${STUDENT_ACCOUNT_PATH}  (saldo=${STUDENT_HAS_DEBT ? STUDENT_DEBT_AMOUNT : 0}, deuda=${STUDENT_HAS_DEBT})`);
});
