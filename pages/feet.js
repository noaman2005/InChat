import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/router';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Layout from '@/components/Layout';
import Navbar from '../components/Navbar';
import { orderBy, query } from 'firebase/firestore';

export default function Feed() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [theories, setTheories] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [likeCount, setLikeCount] = useState(0);
  const [activeCommentId, setActiveCommentId] = useState(null); // Track which theory's comment section is active

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login');
      } else {
        setLoading(false);
        fetchTheories();
        fetchSuggestedUsers();
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchTheories = async () => {
    try {
      // Create a query that orders theories by createdAt in descending order
      const theoriesCollection = collection(db, 'theories');
      const theoriesQuery = query(theoriesCollection, orderBy('createdAt', 'desc')); // Latest first

      const theoriesSnapshot = await getDocs(theoriesQuery);

      const theoriesList = await Promise.all(
        theoriesSnapshot.docs.map(async (theoryDoc) => {
          const theoryData = theoryDoc.data();

          if (!theoryData.userId) {
            console.warn(`No userId associated with theory ID ${theoryDoc.id}`);
            return {
              id: theoryDoc.id,
              ...theoryData,
              userPhotoURL: '/default-avatar.png',
              userDisplayName: 'User',
            };
          }

          const userRef = doc(db, 'users', theoryData.userId);
          let userData = null;

          try {
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              userData = userSnap.data();
            } else {
              console.warn(`No user found for ID: ${theoryData.userId}`);
            }
          } catch (error) {
            console.error("Error fetching user data:", error);
          }

          return {
            id: theoryDoc.id,
            ...theoryData,
            userPhotoURL: userData?.photoURL || '/default-avatar.png',
            userDisplayName: userData?.displayName || 'User',
          };
        })
      );

      setTheories(theoriesList);
    } catch (error) {
      console.error("Error fetching theories:", error);
    }
  };

  const fetchSuggestedUsers = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSuggestedUsers(usersList);
    } catch (error) {
      console.error("Error fetching suggested users:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Sign Out Error:", error.message);
    }
  };

  const selectUser = (user) => {
    console.log("Selected user:", user);
  };

  const handleLike = () => {
    setLikeCount(likeCount + 1);
  };

  const toggleCommentSection = (id) => {
    if (activeCommentId === id) {
      setActiveCommentId(null); // Close if already open
    } else {
      setActiveCommentId(id); // Open the selected comment section
    }
  };

  // Function to generate the share URL for a theory
  const generateShareUrl = (theoryId) => {
    const baseUrl = window.location.origin; // Get the base URL of the current site
    return `${baseUrl}/theory/${theoryId}`; // Assuming the theory details page is at /theory/[theoryId]
  };

  // Function to handle share button click
  const handleShare = (theoryId) => {
    const shareUrl = generateShareUrl(theoryId);
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        alert('Shareable link copied to clipboard: ' + shareUrl);
      })
      .catch((error) => {
        console.error('Error copying shareable link:', error);
      });
  };

  if (loading) {
    return <div className="text-2xl font-bold text-center mt-20">Loading...</div>;
  }

  return (
    <Layout>
      <header className="p-2 flex items-center justify-between m-2">
        <h1 className="text-2xl font-bold text-white">Feed</h1>
      </header>
      <hr className="border-t border-gray-300 mb-6 w-full" />
      <Navbar />
      <div className="flex justify-center space-x-8">
        {/* Theories Section */}
        <div className="max-w-2xl w-full p-4">
          <main className="flex flex-col mt-2 space-y-4 overflow-y-auto">
            {theories.length === 0 ? (
              <p>No theories submitted yet.</p>
            ) : (
              theories.map((theory) => (
                <div key={theory.id} className="bg-white p-4 shadow-md rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <img
                      src={theory.userPhotoURL}
                      alt={theory.userDisplayName}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="font-bold text-gray-800">{theory.userDisplayName}</span>
                  </div>
                  <hr className='w-full border-black' />
                  <h2 className="font-bold mt-5 text-lg">{theory.title}</h2>

                  {theory.mediaUrl && (
                    <img
                      src={theory.mediaUrl}
                      alt="Theory Media"
                      className="mt-2 w-full h-auto rounded-lg max-h-96 object-cover"
                    />
                  )}
                  <p className="p-2 text-gray-600">{theory.description}</p>
                  <div className="flex items-center justify-start mt-4 p-1 space-x-6">
                    <div className="flex items-center space-x-1 cursor-pointer hover:text-red-700 transition-colors duration-200" onClick={handleLike}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                      </svg>
                      <span className="text-gray-600 font-medium">{likeCount}</span>
                    </div>
                    <div className="flex items-center space-x-1 cursor-pointer hover:text-green-300 transition-colors duration-200" onClick={() => toggleCommentSection(theory.id)}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                      </svg>
                    </div>
                    <div className="flex items-center space-x-1 cursor-pointer hover:text-blue-600 transition-colors duration-200" onClick={() => handleShare(theory.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
</svg>

                    </div>
                  </div>
                  {activeCommentId === theory.id && (
                    <div className="mt-4">
                      <textarea placeholder="Leave a comment..." className="border rounded-lg p-2 w-full" />
                      <button className="mt-2 bg-blue-500 text-white rounded-lg px-4 py-2">Comment</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </main>
        </div>

        {/* Suggested Users Section */}
        <div className="h-max bg-white p-4">
          <h2 className="font-bold mb-4">Suggested Users</h2>
          <ul>
            {suggestedUsers.map(user => (
              <li key={user.id} className="flex items-center space-x-2 mb-2 cursor-pointer hover:bg-gray-100 rounded-lg p-2" onClick={() => selectUser(user)}>
                <img src={user.photoURL || '/default-avatar.png'} alt={user.displayName} className="w-10 h-10 rounded-full" />
                <span className="font-medium">{user.displayName}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
}
