import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ReactCalendarHeatmap from "react-calendar-heatmap";
import 'react-calendar-heatmap/dist/styles.css'; 
import './heatmap.css'; 
import {subDays} from "date-fns";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip as ReactTooltip } from 'react-tooltip'
import { ModeToggle } from "@/components/mode-toggle";
import { useTheme } from "@/components/theme-provider";

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const delta = data.newRating - data.oldRating;

        return (
            <div className="p-3 rounded-md shadow border text-sm bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600">
                <p><strong>Contest:</strong> {data.contestName}</p>
                <p><strong>Date:</strong> {data.date}</p>
                <p>
                    <strong>Rating:</strong> {data.oldRating} → {data.newRating} (
                    <span style={{ color: delta >= 0 ? '#16a34a' : '#dc2626' }}>
                        {delta > 0 ? '+' : ''}{delta}
                    </span>)
                </p>
                <p><strong>Rank:</strong> {data.rank}</p>
            </div>
        );
    }

    return null;
};

const StudentStats = () =>{
    const { theme } = useTheme();

    const {handle} = useParams();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedDays, setSelectedDays] = useState(30);
    const [selectedContestDays, setSelectedContestDays] = useState(90);
    const [contestData, setContestData] = useState([]);

    useEffect(() =>{
        const fetchStats = async () => {
            try{
                const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/codeforces/stats/${handle}?days=${selectedDays}`);
                console.log("Fetched stats:", res.data);
                setStats(res.data);
                const contestRes = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/codeforces/contest/${handle}?days=${selectedContestDays}`);
                console.log("Fetched contest history:", contestRes.data.contestStats);
                setContestData(contestRes.data.contestStats || []);
                setLoading(false);
            }catch(err){    
                console.error("Error fetching stats:", err);
                setLoading(false);
            }
        };
        fetchStats();
    }, [handle, selectedDays, selectedContestDays]);

    if(loading) return <div><p className="text-center mt-10">Loading...</p></div>;
    if(!stats) return <div><p className="text-center mt-10 text-red-500">No stats available for this user.</p></div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-4">
            <div className="flex justify-end mb-4">
                <ModeToggle />
            </div>
            <h1 className="text-2xl font-semibold">Stats for {handle}</h1>

            <Select onValueChange={setSelectedDays} defaultValue="30">
            <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="30">Last 7 Days</SelectItem>
                <SelectItem value="90">Last 30 Days</SelectItem>
                <SelectItem value="365">Last 90 Days</SelectItem>
            </SelectContent>
            </Select>

            <Card>
                <CardContent className="p-4 space-y-2">
                    <p><strong>Total Solved: </strong>{stats.totalSolved}</p>
                    <p><strong>Average Problems Solved Per Day: </strong>{stats.averagePerDay}</p>
                    <p><strong>Hardest Problems Solved: </strong>{stats.hardestProblem?.name || 'N/A'}</p>
                    <p><strong>Total Submissions: </strong>{stats.totalSubmissions}</p>
                    {/* <p><strong>Average Rating: </strong>{stats.}</p> */}
                </CardContent>
            </Card>

            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={Object.entries(stats.ratingBuckets).map(([rating, count]) => ({ rating, count }))}>
                    <XAxis dataKey="rating" />
                    <YAxis />
                    <Tooltip
                    contentStyle={{
                        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                        color: theme === 'dark' ? '#f9fafb' : '#1f2937',
                        border: '1px solid #e5e7eb',
                    }}
                    labelStyle={{
                        color: theme === 'dark' ? '#f9fafb' : '#1f2937',
                    }}
                    />
                    <Bar dataKey="count" fill="#4f46e5" />
                </BarChart>
            </ResponsiveContainer>

            <h2 className="text-xl font-medium mt-6">Activity Heatmap</h2>
            <ReactCalendarHeatmap
                startDate={subDays(new Date(), 365)}
                endDate={new Date()}
                values={Object.entries(stats.submissionHeatmap).map(([date, { total, correct }]) => ({
                    date,
                    total,
                    correct
                }))}
                classForValue={(value) => {
                    if (!value || value.total === 0) return 'color-empty';
                    if (value.total < 2) return 'color-github-1';
                    if (value.total < 4) return 'color-github-2';
                    if (value.total < 6) return 'color-github-3';
                    return 'color-github-4';
                }}
                tooltipDataAttrs={(value) => {
                    if (!value || !value.date) return null;
                   return {
                        'data-tooltip-id': 'heatmap-tooltip',
                        'data-tooltip-content': `${value.date} — ${value.total || 0} total submissions, ${value.correct || 0} correct`
                    };
                }}
            />
            <ReactTooltip id="heatmap-tooltip" />
            
            <Select onValueChange={setSelectedContestDays} defaultValue="90">
            <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="365">Last 365 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
            </Select>

            <ResponsiveContainer width="100%" height={300}>
            <LineChart data={contestData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomTooltip/>}/>
                <Line type="monotone" dataKey="newRating" stroke="#4f46e5" />
            </LineChart>
            </ResponsiveContainer>

            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Contest</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>Rating Change</TableHead>
                <TableHead>Unsolved</TableHead>
                </TableRow>
            </TableHeader>
            {Array.isArray(contestData) && contestData.length > 0 ? (
            <TableBody>
                {contestData.map((contest) => (
                <TableRow key={contest.contestId}>
                    <TableCell>
                    <a href={`https://codeforces.com/contest/${contest.contestId}`} target="_blank" rel="noreferrer">
                        {contest.contestName}
                    </a>
                    </TableCell>
                    <TableCell>{contest.date}</TableCell>
                    <TableCell>{contest.rank}</TableCell>
                    <TableCell>
                        {contest.oldRating} → {contest.newRating}{" "}
                        <span className={contest.ratingChange >= 0 ? "text-green-600" : "text-red-600"}>
                            ({contest.ratingChange >= 0 ? "+" : ""}
                            {contest.ratingChange})
                        </span>
                    </TableCell>
                    <TableCell>{contest.unsolvedProblems}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            ) : (
            <TableBody>
                <TableRow><TableCell colSpan={5}>No contest data</TableCell></TableRow>
            </TableBody>
            )}
            </Table>
        </div>
        );
    };

export default StudentStats;