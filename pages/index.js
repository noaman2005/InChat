import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase'; // Firebase config
import Login from './login'; // Login component
import Feed from './feet'; // Feed component
import Navbar from '../components/Navbar'; // Import Navbar component

export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Loading state

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user); // Set user state based on auth state
      setLoading(false); // Stop loading after checking auth state
    });

    return () => unsubscribe(); // Clean up the subscription
  }, []);

  if (loading) {
    return <div className="text-2xl font-bold text-center mt-20">Loading...</div>; // Show loading indicator
  }

  return (
    <div className="flex">
      {/* Include Navbar */}
      <Navbar />

      {/* Main content area with margin to avoid overlap with Navbar */}
      <div className="ml-20 p-6 w-full">
        {user ? <Feed /> : <Login />} {/* Render Feed or Login based on auth state */}
      </div>
    </div>
  );
}
