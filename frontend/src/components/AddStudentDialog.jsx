import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import axios from 'axios';

const AddStudentDialog = ({ onStudentAdded, editStudent, setEditStudent }) => {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phoneNo: "",
    codeforcesHandle: "",
  });
  const [loading, setLoading] = React.useState(false);


  useEffect(() => {
    if (editStudent) {
      setForm({
        name: editStudent.name || "",
        email: editStudent.email || "",
        phoneNo: editStudent.phoneNo || "",
        codeforcesHandle: editStudent.codeforcesHandle || "",
      });
      setOpen(true);
    }
  }, [editStudent]);

  const handleInput = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.phoneNo || !form.codeforcesHandle) {
      alert("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
        if (editStudent?._id) {
            await axios.put(`http://localhost:5000/api/students/${editStudent._id}`, form);
        } else {
            await axios.post("http://localhost:5000/api/students", form);
        }
        onStudentAdded();
        setOpen(false);
        setEditStudent(null);
        setForm({ name: "", email: "", phoneNo: "", codeforcesHandle: "" });
    } catch (error) {
        const msg = error.response?.data?.error || "Something went wrong!";
        alert(msg);
    } finally {
        setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditStudent(null);
    setForm({
      name: "",
      email: "",
      phoneNo: "",
      codeforcesHandle: "",
    });
  };

  return (
    <Dialog
    open={open}
    onOpenChange={(state) => {
        setOpen(state);
        if (!state) {
        handleClose();
        }
    }}
    >
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>Add Student</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editStudent ? "Edit Student" : "Add New Student"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            name="name"
            placeholder="Name"
            value={form.name}
            onChange={handleInput}
          />
          <Input
            name="email"
            placeholder="xyz@gmail.com"
            value={form.email}
            onChange={handleInput}
          />
          <Input
            name="phoneNo"
            placeholder="+91 12345 67890"
            value={form.phoneNo}
            onChange={handleInput}
          />
          <Input
            name="codeforcesHandle"
            placeholder="tourist"
            value={form.codeforcesHandle}
            onChange={handleInput}
          />
        </div>
        <DialogFooter>
            <Button onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : editStudent ? "Update Student" : "Save"}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;
