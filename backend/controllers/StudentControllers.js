const Student = require("../models/Student");
const syncStudentByHandle = require("../utils/syncStudentByHandle");

exports.createStudent = async (req, res) => {
  console.log("Incoming body:", req.body);
  try {
    const student = new Student(req.body);
    await student.save();

    const synced = await syncStudentByHandle(student.codeforcesHandle);
    res.status(201).json(synced);
  } catch (err) {
    console.error("Create student error:", err);
    res.status(400).json({ error: err.message });
  }
};

exports.getStudent = async(req, res)=>{
    try{
        const students = await Student.find();
        res.status(200).json(students);
    }
    catch(err){
        res.status(500).json({error: err.message});
    }
};

exports.getStudentById = async(req, res)=>{
    try{
        const student = await Student.findById(req.params.id);
        if(!student){
            return res.status(404).json({error: "No such student found"});
        }
        res.status(200).json(student);
    }
    catch(err){
        res.status(500).json({error: err.message});
    }
};

exports.updateStudent = async(req, res)=>{
    try{
        const updated = await Student.findByIdAndUpdate(req.params.id, req.body, {new: true});
        if(!updated){
            return res.status(404).json({error: "No such student found"});
        }

        if(req.body.codeforcesHandle){
            const synced = await syncStudentByHandle(req.body.codeforcesHandle);
            return res.status(200).json(synced);
        }
        res.status(200).json(updated);
    }
    catch(err){
        res.status(500).json({error: err.message});
    }
}

exports.toggleEmailReminder = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { emailRemindersDisabled: req.body.emailRemindersDisabled },
      { new: true }
    );
    res.json(student);
  } catch (err) {
    console.error("Error toggling email reminder:", err);
    res.status(500).json({ error: "Failed to toggle reminder" });
  }
};

exports.deleteStudent = async(req, res)=>{
    try{
        const deleted = await Student.findByIdAndDelete(req.params.id);
        if(!deleted){
            return res.status(404).json({error: "No such student found"});
        }
        res.status(200).json(deleted);
    }
    catch(err){
        res.status(500).json({error: err.message});
    }
}

