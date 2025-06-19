import AddStudentDialog from "@/components/AddStudentDialog";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import axios from "axios";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function StudentTable() {
    const [students, setStudents] = useState([]);
    const [editStudent, setEditStudent] = useState(null);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/students");
            setStudents(res.data);
        } catch (err) {
            console.error("Error fetching students:", err);
        }
    };

    const deleteStudent = async (id) => {
        if (!window.confirm("Are you sure you want to delete this student?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/students/${id}`);
            fetchStudents(); // refresh table
        } catch (err) {
            console.error("Error deleting student:", err);
        }
    };

    const toggleEmailReminder = async (id, currentDisabled) => {
        try {
            await axios.put(`http://localhost:5000/api/students/${id}/toggle-reminder`, {
            emailRemindersDisabled: !currentDisabled,
            });
            setStudents(prev =>
                prev.map(s =>
                    s._id === id ? { ...s, emailRemindersDisabled: !currentDisabled } : s
                )
            );
        } catch (err) {
            console.error("Failed to toggle email reminder:", err);
            alert("Error toggling email reminder");
        }
    };


    return (
        <div className="p-6">
            <div className="flex justify-end mb-4">
                <ModeToggle />
            </div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Student Progress Table</h1>
                <AddStudentDialog
                    onStudentAdded={fetchStudents}
                    editStudent={editStudent}
                    setEditStudent={setEditStudent}
                />
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-center">Name</TableHead>
                            <TableHead className="text-center">Email</TableHead>
                            <TableHead className="text-center">Phone</TableHead>
                            <TableHead className="text-center">CF Handle</TableHead>
                            <TableHead className="text-center">Current Rating</TableHead>
                            <TableHead className="text-center">Max Rating</TableHead>
                            <TableHead className="text-center">Email Reminders</TableHead>
                            <TableHead className="text-center">Last Synced</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map((s) => (
                            <TableRow key={s._id}>
                                <TableCell className="text-center">{s.name}</TableCell>
                                <TableCell className="text-center">{s.email}</TableCell>
                                <TableCell className="text-center">{s.phoneNo}</TableCell>
                                <TableCell className="text-center">{s.codeforcesHandle}</TableCell>
                                <TableCell className="text-center">{s.currRating}</TableCell>
                                <TableCell className="text-center">{s.maxRating}</TableCell>
                                <TableCell className="text-center">
                                <Switch
                                    checked={!s.emailRemindersDisabled}
                                    onCheckedChange={() =>
                                        toggleEmailReminder(s._id, s.emailRemindersDisabled)
                                    }
                                />
                                </TableCell>
                                <TableCell className="text-center">{new Date(s.lastSyncedAt).toLocaleString()}</TableCell>
                                <TableCell className="flex gap-1 justify-center">
                                    <Link to={`/student/${s.codeforcesHandle}`}>
                                        <Button variant="outline">View</Button>
                                    </Link>
                                    <Button variant="outline" onClick={() => setEditStudent(s)}>
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="text-red-500 hover:text-red-700"
                                        size="icon"
                                        onClick={() => deleteStudent(s._id)}
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
