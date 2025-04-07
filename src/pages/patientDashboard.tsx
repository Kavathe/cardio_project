import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

interface Report {
  id: string;
  date: string;
  diagnosis: string;
  status: string;
  doctorName?: string;
  heartClass?: string;
}

const PatientDashboard = () => {
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    numericId: null as number | null,
  });
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get user info from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserData({
          username: parsedUser.username || 'Patient',
          email: parsedUser.email || '',
          numericId: parsedUser.numericId || null,
        });

        // Fetch reports once we have the user ID
        if (parsedUser.numericId) {
          fetchPatientReports(parsedUser.numericId);
        } else {
          setError("User ID not found. Please login again.");
          setLoading(false);
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        setError("Error loading user data. Please login again.");
        setLoading(false);
      }
    } else {
      setError("User not logged in. Please login to view reports.");
      setLoading(false);
    }
  }, []);

  const fetchPatientReports = async (userId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:5000/api/v1/patients/user/${userId}`);
      
      if (response.status === 404) {
        // No reports found is not an error condition
        setReports([]);
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Error fetching reports: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Map the API response to the format expected by our component
      // and filter to only show completed reports
      const formattedReports = (data.reports || [])
        .filter(report => report.status?.toLowerCase() === 'completed')
        .map(report => ({
          id: report.id || report._id,
          date: report.date,
          diagnosis: report.description || report.diagnosis || 'No diagnosis',
          status: report.status, // Keep this for internal use
          doctorName: report.doctorName || 'Unknown',
          heartClass: report.heartClass || report.class || report.predictedClass || 'N/A'
        }));
      
      setReports(formattedReports);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching patient reports:', error);
      // Only set error for actual errors, not for "no reports found"
      setError("Failed to load your reports. Please try again later.");
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow min-h-screen container mx-auto px-4 py-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">
            Your Medical Reports
          </h1>
          <p className="text-text-light mt-2">
            Welcome back, {userData.username}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {reports.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-700">No Medical Reports Yet</h3>
                <p className="mt-2 text-gray-500 max-w-md mx-auto">
                  Your medical report history appears to be empty. When you have reports, they will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Doctor
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Predicted Class
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Diagnosis
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(report.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {report.doctorName || 'Not assigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {report.heartClass || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {report.diagnosis || 'Not specified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PatientDashboard;
