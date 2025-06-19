const express = require('express');
const router = express.Router();
const studentController = require("../controllers/StudentControllers");

router.get('/', studentController.getStudent);

router.get('/:id', studentController.getStudentById);

router.post('/', studentController.createStudent);

router.put('/:id', studentController.updateStudent);

router.put('/:id/toggle-reminder', studentController.toggleEmailReminder);

router.delete('/:id', studentController.deleteStudent);

module.exports = router;
