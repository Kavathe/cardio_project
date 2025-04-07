import { useState, useEffect, useRef } from 'react';
import { FileText, CheckCircle, Clock, PlusCircle, Search, Calendar, Edit, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';

const API_BASE_URL = "http://localhost:5000/api/v1";

interface Report {
  id: string;
  _id?: string;  // Add optional MongoDB _id field
  patientId: string;
  patientName: string;
  doctorName: string;
  heartClass: 'L' | 'N' | 'R' | 'V';
  description: string;
  date: string;
  status: 'pending' | 'completed';
  result?: string;
}

const ReportsDashboard = () => {
  const location = useLocation();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newReport, setNewReport] = useState<Omit<Report, 'id' | 'status'>>({
    patientId: '',
    patientName: '',
    doctorName: '',
    heartClass: 'N',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const { toast } = useToast();

  // Add state for the report card popup
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportCard, setShowReportCard] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const reportsPerPage = 10;

  // Filter states
  const [filterPatientId, setFilterPatientId] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  
  // Autocomplete states
  const [patientSuggestions, setPatientSuggestions] = useState<{id: string, username: string, numeric_id: number}[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Create a ref for the autocomplete container
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Fetch all reports from the backend
  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/patients`);
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      const data = await response.json();
      setReports(data);
    } catch (err) {
      setError('Error fetching reports. Please try again.');
      toast({
        title: "Error",
        description: "Failed to load reports. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch specific patient by ID
  const fetchPatientById = async (patientId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/${patientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch patient');
      }
      const data = await response.json();
      return data;
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to load patient: ${patientId}`,
        variant: "destructive"
      });
      return null;
    }
  };

  // Create or update a report
  const handleAddReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let response;
      let reportData;
      
      if (editingReport) {
        // Log report identifiers for debugging
        logReportIdentifiers(editingReport, 'Update Report');
        
        // Get unique report ID for update
        const reportId = editingReport._id || editingReport.id;
        console.log(`Updating report with ID: ${reportId}`);
        console.log('Editing report object:', editingReport);
        console.log('Form data being sent:', newReport);
        
        // Update existing report using the unique report ID (not patientId)
        response = await fetch(`${API_BASE_URL}/patients/${reportId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newReport),
        });
        
        console.log(`Update response status: ${response.status}`);
        
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        if (!response.ok) {
          throw new Error(`Failed to update report: ${response.statusText}. Response: ${responseText}`);
        }
        
        try {
          reportData = JSON.parse(responseText);
          console.log('Updated report data:', reportData);
        } catch (parseError) {
          console.error('Error parsing response JSON:', parseError);
          throw new Error('Invalid response format from server');
        }
        
        // Update the reports list, matching by unique ID
        setReports(reports.map(report => 
          (report.id === editingReport.id || (report._id && report._id === editingReport._id)) 
            ? reportData 
            : report
        ));
        
        toast({ 
          title: "Report Updated",
          description: "The report has been updated successfully",
        });
      } else {
        // Create new report
        response = await fetch(`${API_BASE_URL}/patients`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...newReport,
            status: 'pending'
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create report');
        }
        
        reportData = await response.json();
        
        // Add the new report to the list
        setReports([...reports, reportData]);
        
        toast({
          title: "Report Added",
          description: "The new report has been added successfully",
        });
      }
      
      // Reset form
      setShowForm(false);
      setEditingReport(null);
      setNewReport({
        patientId: '',
        patientName: '',
        doctorName: '',
        heartClass: 'N',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      // Refresh reports
      fetchReports();
      
    } catch (err) {
      console.error('Error handling report:', err);
      toast({
        title: "Error",
        description: editingReport ? "Failed to update report" : "Failed to create report",
        variant: "destructive"
      });
    }
  };

  // Update report status (mark as completed)
  const updateReportStatus = async (report: Report, status: 'pending' | 'completed') => {
    try {
      // Use the report's unique ID (not patientId) for status update
      const reportId = report._id || report.id;
      console.log(`Updating report with ID: ${reportId} to status: ${status}`);
      
      const response = await fetch(`${API_BASE_URL}/patients/${reportId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      const updatedReport = await response.json();
      
      // Update the reports list, matching by the unique report ID
      setReports(prevReports => 
        prevReports.map(r => {
          // Skip null/undefined reports
          if (!r) return r;
          
          // Match by unique report ID instead of patientId
          if (r.id === report.id || (r._id && r._id === report._id)) {
            return { ...r, status };
          }
          return r;
        })
      );
      
      toast({
        title: "Status Updated",
        description: `Report status updated to ${status}`,
      });
      
      // Refresh reports to ensure consistency
      fetchReports();
      
    } catch (err) {
      console.error("Error updating status:", err);
      toast({
        title: "Error",
        description: "Failed to update report status",
        variant: "destructive"
      });
    }
  };

  // Helper function to log report identifiers for debugging
  const logReportIdentifiers = (report: Report, action: string) => {
    if (!report) {
      console.warn(`${action} - Report is null or undefined`);
      return;
    }
    
    console.log(`${action} - Report identifiers:`, {
      id: report.id,
      _id: report._id,
      patientId: report.patientId,
      date: report.date,
      status: report.status
    });
  };

  const handleEditReport = async (report: Report) => {
    // Log report identifiers for debugging
    logReportIdentifiers(report, 'Edit Report');
    
    // Use the report's unique ID (id or _id) instead of patientId
    const reportId = report._id || report.id;
    console.log(`Editing report with ID: ${reportId}`);
    
    try {
      // Fetch the latest data for this report using its unique ID
      const response = await fetch(`${API_BASE_URL}/patients/${reportId}`);
      
      if (!response.ok) {
        console.log(`Failed to fetch report with ID: ${reportId}. Using existing data.`);
        // If fetch fails, use the existing data
        setEditingReport(report);
        setNewReport({
          patientId: report.patientId,
          patientName: report.patientName,
          doctorName: report.doctorName || '',
          heartClass: report.heartClass,
          description: report.description || '',
          date: report.date
        });
      } else {
        // Use the fetched data
        const latestData = await response.json();
        console.log('Got latest data for editing:', latestData);
        
        setEditingReport(latestData);
        setNewReport({
          patientId: latestData.patientId,
          patientName: latestData.patientName,
          doctorName: latestData.doctorName || '',
          heartClass: latestData.heartClass,
          description: latestData.description || '',
          date: latestData.date
        });
      }
      
      setShowForm(true);
    } catch (error) {
      console.error('Error fetching report for edit:', error);
      
      // Fallback to existing data if fetch fails
      setEditingReport(report);
      setNewReport({
        patientId: report.patientId,
        patientName: report.patientName,
        doctorName: report.doctorName || '',
        heartClass: report.heartClass,
        description: report.description || '',
        date: report.date
      });
      setShowForm(true);
      
      toast({
        title: "Warning",
        description: "Using local data as server fetch failed",
        variant: "destructive"
      });
    }
  };

  // Function to handle viewing a report with the card popup
  const handleViewReport = async (report: Report) => {
    try {
      // Use the report's unique ID (id or _id) instead of patientId
      const reportId = report._id || report.id;
      console.log(`Viewing report with ID: ${reportId}`);
      
      // Fetch the latest data for this specific report
      const response = await fetch(`${API_BASE_URL}/patients/${reportId}`);
      
      if (!response.ok) {
        console.log(`Failed to fetch report with ID: ${reportId}. Using existing data.`);
        // If fetch fails, use the existing report data
        setSelectedReport(report);
      } else {
        // Use the fetched data
        const latestData = await response.json();
        console.log('Got latest data for viewing:', latestData);
        setSelectedReport(latestData);
      }
      
      setShowReportCard(true);
    } catch (err) {
      console.error('Error in handleViewReport:', err);
      // If any error occurs, fall back to the existing report data
      setSelectedReport(report);
      setShowReportCard(true);
      
      toast({
        title: "Error",
        description: "Failed to view report details",
        variant: "destructive"
      });
    }
  };

  // Function to close the report card
  const closeReportCard = () => {
    setShowReportCard(false);
    setSelectedReport(null);
  };

  // Function to set doctor name directly from localStorage
  const setDoctorNameFromLocalStorage = () => {
    try {
      const userDataString = localStorage.getItem('user');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        if (userData && userData.username) {
          const doctorName = `Dr. ${userData.username}`;
          setNewReport(prev => ({
            ...prev,
            doctorName: doctorName
          }));
        }
      }
    } catch (error) {
      console.error('Error setting doctor name from localStorage:', error);
    }
  };

  // Update handleShowForm to use the new function
  const handleShowForm = async () => {
    // Only fetch user data if we're not editing a report
    if (!editingReport) {
      setDoctorNameFromLocalStorage();
    }
    setShowForm(true);
  };

  // Load reports on component mount
  useEffect(() => {
    fetchReports();
  }, []);

  // Check for incoming heart class and set up form
  useEffect(() => {
    if (location.state && location.state.heartClass) {
      // Get heart class from location state
      const heartClass = location.state.heartClass;
      
      // Get user data directly from localStorage
      const userDataString = localStorage.getItem('user');
      
      if (userDataString) {
        try {
          // Parse the JSON data
          const userData = JSON.parse(userDataString);
          
          // Set doctor name directly from localStorage
          if (userData && userData.username) {
            const doctorName = `Dr. ${userData.username}`;
            
            // Update form with heart class and doctor name
            setNewReport(prev => ({
              ...prev,
              heartClass: mapHeartClassToFormValue(heartClass),
              doctorName: doctorName
            }));
          } else {
            // No username found, just set the heart class
            setNewReport(prev => ({
              ...prev,
              heartClass: mapHeartClassToFormValue(heartClass)
            }));
          }
        } catch (error) {
          console.error("Error parsing user data:", error);
          
          // Just set the heart class in case of error
          setNewReport(prev => ({
            ...prev,
            heartClass: mapHeartClassToFormValue(heartClass)
          }));
        }
      } else {
        // No user data in localStorage, just set the heart class
        setNewReport(prev => ({
          ...prev,
          heartClass: mapHeartClassToFormValue(heartClass)
        }));
      }
      
      // Show the form automatically
      setShowForm(true);
    }
  }, [location]);
  
  // Helper function to map heart class from ECG to form format
  const mapHeartClassToFormValue = (ecgClass) => {
    switch(ecgClass) {
      case 'N': return 'N';
      case 'L': return 'L';
      case 'R': return 'R';
      case 'V': return 'V';
      default: return 'N'; // Default case
    }
  };

  // Filter reports based on criteria
  const filteredReports = reports.filter(report => {
    // Skip null or undefined reports
    if (!report) return false;
    
    // Check if patientId exists and is a string before using toLowerCase
    const matchesId = !filterPatientId ? true : 
      (report.patientId && typeof report.patientId === 'string') 
        ? report.patientId.toLowerCase().includes(filterPatientId.toLowerCase())
        : false;
    
    // Only process date filtering if report.date exists
    let startDateMatch = true;
    let endDateMatch = true;
    
    if (report.date) {
      try {
        const reportDate = new Date(report.date);
        
        // Only apply date filters if they are valid dates
        if (filterStartDate && !isNaN(new Date(filterStartDate).getTime())) {
          startDateMatch = reportDate >= new Date(filterStartDate);
        }
        
        if (filterEndDate && !isNaN(new Date(filterEndDate).getTime())) {
          endDateMatch = reportDate <= new Date(filterEndDate);
        }
      } catch (error) {
        console.error('Invalid date format:', report.date);
        // Keep default true values if date parsing fails
      }
    }
    
    return matchesId && startDateMatch && endDateMatch;
  });

  // Get current reports for pagination
  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = filteredReports.slice(indexOfFirstReport, indexOfLastReport);
  
  // Separate pending and completed reports with null check
  const pendingReports = filteredReports.filter(report => report && report.status === 'pending');
  const completedReports = filteredReports.filter(report => report && report.status === 'completed');

  // Calculate total pages for pagination
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);

  // Generate page numbers array for pagination
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  // Add function to fetch patient suggestions
  const fetchPatientSuggestions = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setPatientSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(`${API_BASE_URL}/patients/autocomplete?search=${encodeURIComponent(searchTerm)}&limit=5`);
      if (!response.ok) {
        throw new Error('Failed to fetch patient suggestions');
      }
      const data = await response.json();
      setPatientSuggestions(data.patients || []);
      setShowSuggestions(data.patients && data.patients.length > 0);
    } catch (err) {
      console.error('Error fetching patient suggestions:', err);
      setPatientSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Handle patient name input change with debounce
  const handlePatientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewReport({...newReport, patientName: value});
    
    // Debounce the API call
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      fetchPatientSuggestions(value);
    }, 300); // 300ms debounce
    
    setSearchTimeout(timeout);
  };

  // Handle patient suggestion selection
  const handleSelectPatient = (patient: {id: string, username: string, numeric_id: number}) => {
    setNewReport({
      ...newReport, 
      patientName: patient.username,
      patientId: patient.numeric_id.toString()
    });
    setShowSuggestions(false);
  };

  // Add effect to handle clicks outside the autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-gray-50 pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-text mb-8">Reports Dashboard</h1>

          {/* Report Card Popup */}
          {showReportCard && selectedReport && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
              {/* <Card className="relative w-full max-w-md"> */}
              <Card className="relative w-full max-w-md bg-white/70">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-2" 
                  onClick={closeReportCard}
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardHeader>
                  <CardTitle>Patient Report</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Patient ID</p>
                      <p className="font-medium">{selectedReport.patientId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Patient Name</p>
                      <p className="font-medium">{selectedReport.patientName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Doctor</p>
                      <p className="font-medium">{selectedReport.doctorName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Heart Class</p>
                      <p className="font-medium">{selectedReport.heartClass}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{selectedReport.date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className={`font-medium ${
                        selectedReport.status === 'pending' 
                          ? 'text-yellow-600' 
                          : 'text-green-600'
                      }`}>
                        {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="mt-1">{selectedReport.description}</p>
                  </div>

                  {selectedReport.result && (
                    <div>
                      <p className="text-sm text-muted-foreground">Result</p>
                      <p className="mt-1">{selectedReport.result}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Add New Report Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-text">
                {editingReport ? "Edit Report" : "Reports Management"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!showForm ? (
                <Button 
                  onClick={handleShowForm}
                  className="w-full flex items-center justify-center gap-2 py-6"
                >
                  <PlusCircle className="h-5 w-5" />
                  <span>{editingReport ? "Edit Report" : "Add New Report"}</span>
                </Button>
              ) : (
                <form onSubmit={handleAddReport} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="patientId">Patient ID</Label>
                      <Input
                        id="patientId"
                        type="text"
                        required
                        value={newReport.patientId}
                        onChange={(e) => setNewReport({...newReport, patientId: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="patientName">Patient Name</Label>
                      <div className="relative" ref={autocompleteRef}>
                        <Input
                          id="patientName"
                          type="text"
                          required
                          value={newReport.patientName}
                          onChange={handlePatientNameChange}
                          onFocus={() => newReport.patientName && newReport.patientName.length >= 2 && fetchPatientSuggestions(newReport.patientName)}
                          className="w-full"
                          placeholder="Start typing to search patients..."
                        />
                        {isLoadingSuggestions && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                          </div>
                        )}
                        {showSuggestions && patientSuggestions.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 border border-gray-200 max-h-60 overflow-auto">
                            {patientSuggestions.map(patient => (
                              <div 
                                key={patient.id}
                                onClick={() => handleSelectPatient(patient)}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex justify-between"
                              >
                                <span>{patient.username}</span>
                                <span className="text-gray-500 text-sm">ID: {patient.numeric_id}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="doctorName">Doctor Name</Label>
                      <Input
                        id="doctorName"
                        type="text"
                        required
                        value={newReport.doctorName}
                        onChange={(e) => setNewReport({...newReport, doctorName: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="heartClass">Class of Heart Health</Label>
                      <select
                        id="heartClass"
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={newReport.heartClass}
                        onChange={(e) => setNewReport({
                          ...newReport, 
                          heartClass: e.target.value as 'L' | 'N' | 'R' | 'V'
                        })}
                      >
                        <option value="L">L</option>
                        <option value="N">N</option>
                        <option value="R">R</option>
                        <option value="V">V</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        required
                        value={newReport.date}
                        onChange={(e) => setNewReport({...newReport, date: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      rows={3}
                      value={newReport.description}
                      onChange={(e) => setNewReport({...newReport, description: e.target.value})}
                    />
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowForm(false);
                        setEditingReport(null);
                        setNewReport({
                          patientId: '',
                          patientName: '',
                          doctorName: '',
                          heartClass: 'N',
                          description: '',
                          date: new Date().toISOString().split('T')[0]
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingReport ? 'Update Report' : 'Submit Report'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Filter Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-text">
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="patientId">Patient ID</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="patientId"
                      placeholder="Filter by Patient ID"
                      value={filterPatientId}
                      onChange={(e) => setFilterPatientId(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setFilterPatientId('')}
                      title="Clear filter"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reports List Table */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-text">
                Reports List
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <p>Loading reports...</p>
                </div>
              ) : error ? (
                <div className="flex justify-center items-center h-40 text-red-500">
                  <p>{error}</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient ID</TableHead>
                        <TableHead>Patient Name</TableHead>
                        <TableHead>Doctor Name</TableHead>
                        <TableHead>Heart Class</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            No reports found
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>{report.patientId}</TableCell>
                            <TableCell>{report.patientName}</TableCell>
                            <TableCell>{report.doctorName || 'N/A'}</TableCell>
                            <TableCell>{report.heartClass}</TableCell>
                            <TableCell>{report.date}</TableCell>
                            <TableCell>
                              <span className={`px-3 py-1 rounded-full text-sm ${
                                report.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-green-100 text-green-800'
                              }`}>
                                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleEditReport(report)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleViewReport(report)}
                                >
                                  View
                                </Button>
                                {report.status === 'pending' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="text-green-600"
                                    onClick={() => {
                                      if (report && report.patientId) {
                                        updateReportStatus(report, 'completed');
                                      } else {
                                        toast({
                                          title: "Error",
                                          description: "Invalid patient ID",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Complete
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-6">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                          
                          {pageNumbers.map(number => (
                            <PaginationItem key={number}>
                              <PaginationLink 
                                isActive={currentPage === number}
                                onClick={() => setCurrentPage(number)}
                              >
                                {number}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Pending and Completed Reports Sections */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Pending Reports */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center mb-4">
                <Clock className="w-5 h-5 text-yellow-500 mr-2" />
                <h2 className="text-xl font-semibold text-text">Pending Reports</h2>
              </div>
              <div className="space-y-4">
                {isLoading ? (
                  <p className="text-gray-500 text-center py-4">Loading...</p>
                ) : pendingReports.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No pending reports</p>
                ) : (
                  pendingReports.map(report => (
                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <p className="font-medium text-text">{report.patientName}</p>
                          <p className="text-sm text-gray-500">ID: {report.patientId} • Dr. {report.doctorName || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">Date: {report.date} • Class: {report.heartClass}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditReport(report)}
                          className="flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-green-600"
                          onClick={() => {
                            if (report && report.patientId) {
                              updateReportStatus(report, 'completed');
                            } else {
                              toast({
                                title: "Error",
                                description: "Invalid patient ID",
                                variant: "destructive"
                              });
                            }
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Completed Reports */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center mb-4">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <h2 className="text-xl font-semibold text-text">Completed Reports</h2>
              </div>
              <div className="space-y-4">
                {isLoading ? (
                  <p className="text-gray-500 text-center py-4">Loading...</p>
                ) : completedReports.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No completed reports</p>
                ) : (
                  completedReports.map(report => (
                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <p className="font-medium text-text">{report.patientName}</p>
                          <p className="text-sm text-gray-500">ID: {report.patientId} • Dr. {report.doctorName || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">Date: {report.date} • Class: {report.heartClass}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditReport(report)}
                          className="flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewReport(report)}
                          className="text-green-600"
                        >
                          View Report
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ReportsDashboard;