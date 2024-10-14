import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/router';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, orderBy, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Layout from '@/components/Layout';
import Navbar from '../components/Navbar';

export default function Feed() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [theories, setTheories] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [activeCommentId, setActiveCommentId] = useState(null); // Track which theory's comment section is active
  const [commentText, setCommentText] = useState(''); // Track current comment text
  const [comments, setComments] = useState({}); // Track comments for each theory

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
      const theoriesCollection = collection(db, 'theories');
      const theoriesQuery = query(theoriesCollection, orderBy('createdAt', 'desc')); // Latest first
      const theoriesSnapshot = await getDocs(theoriesQuery);

      const theoriesList = await Promise.all(
        theoriesSnapshot.docs.map(async (theoryDoc) => {
          const theoryData = theoryDoc.data();

          // Fetch associated comments
          const commentsCollection = collection(db, 'theories', theoryDoc.id, 'comments');
          const commentsQuery = query(commentsCollection, orderBy('createdAt', 'desc'));
          const commentsSnapshot = await getDocs(commentsQuery);
          const theoryComments = await Promise.all(
            commentsSnapshot.docs.map(async (commentDoc) => {
              const commentData = commentDoc.data();

              // Fetch commenter's user data
              const userRef = doc(db, 'users', commentData.userId);
              const userSnap = await getDoc(userRef);
              const userData = userSnap.exists() ? userSnap.data() : { displayName: 'Anonymous' };

              return {
                id: commentDoc.id,
                ...commentData,
                userDisplayName: userData?.displayName || 'User',
              };
            })
          );

          setComments((prev) => ({
            ...prev,
            [theoryDoc.id]: theoryComments,
          }));

          // Fetch user data
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
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists() ? userSnap.data() : null;

          return {
            id: theoryDoc.id,
            ...theoryData,
            userPhotoURL: userData?.photoURL || '/default-avatar.png',
            userDisplayName: userData?.displayName || 'User',
            likes: theoryData.likes || 0, // Track likes
            likedBy: theoryData.likedBy || [], // Track users who liked the theory
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

  const toggleCommentSection = (id) => {
    setActiveCommentId(activeCommentId === id ? null : id); // Toggle comment section visibility
  };

  const handleCommentChange = (event) => {
    setCommentText(event.target.value);
  };

  const handleCommentSubmit = async (theoryId) => {
    if (!commentText) return;

    try {
      const commentRef = collection(db, 'theories', theoryId, 'comments');
      await addDoc(commentRef, {
        text: commentText,
        createdAt: new Date(),
        userId: auth.currentUser.uid,
      });
      setCommentText('');
      toggleCommentSection(theoryId); // Close after submitting
      fetchTheories(); // Re-fetch theories to update comments
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleLike = async (theoryId) => {
    const currentUserId = auth.currentUser.uid;
  
    // Optimistically update the UI by updating the specific theory's like count in the state
    setTheories((prevTheories) =>
      prevTheories.map((theory) => {
        if (theory.id === theoryId) {
          // Check if the user has already liked the theory
          const likedBy = Array.isArray(theory.likedBy) ? theory.likedBy : [];
          const isLiked = likedBy.includes(currentUserId);
  
          // Update like count and likedBy list optimistically
          return {
            ...theory,
            likes: isLiked ? theory.likes - 1 : theory.likes + 1,
            likedBy: isLiked
              ? likedBy.filter((id) => id !== currentUserId)
              : [...likedBy, currentUserId],
          };
        }
        return theory;
      })
    );
  
    // Update Firestore after optimistically updating the state
    try {
      const theoryRef = doc(db, 'theories', theoryId);
      const theoryDoc = await getDoc(theoryRef);
      const theoryData = theoryDoc.data();
  
      const likedBy = Array.isArray(theoryData.likedBy) ? theoryData.likedBy : [];
      const isLiked = likedBy.includes(currentUserId);
  
      if (isLiked) {
        // If already liked, remove the like
        await updateDoc(theoryRef, {
          likes: theoryData.likes - 1,
          likedBy: arrayRemove(currentUserId),
        });
      } else {
        // If not liked, add the like
        await updateDoc(theoryRef, {
          likes: theoryData.likes + 1,
          likedBy: arrayUnion(currentUserId),
        });
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };
  

  const handleShare = (theoryId) => {
    const shareUrl = `${window.location.origin}/theory/${theoryId}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => alert('Shareable link copied to clipboard: ' + shareUrl))
      .catch((error) => console.error('Error copying shareable link:', error));
  };

  if (loading) {
    return <div className="text-2xl font-bold text-center mt-20">Loading...</div>;
  }

  return (
    <Layout>
      <header className="p-2 flex items-center justify-between m-2">
        <h1 className="text-2xl font-bold text-white">Feet Pics Only</h1>
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
                  <p className="p-2 text-black font-semibold">{theory.description}</p>
                  <div className="flex items-center justify-start mt-4 p-1 space-x-6">
                    <div
                      className={`flex items-center space-x-1 cursor-pointer hover:text-red-700 transition-colors duration-200 ${theory.likedBy.includes(auth.currentUser.uid) ? 'text-red-500' : ''}`}
                      onClick={() => handleLike(theory.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill={theory.likedBy.includes(auth.currentUser.uid) ? 'red' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6.35 6.35 0 0116.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <span className="text-gray-600 font-medium">{theory.likes}</span>
                    </div>
                    <div
                      className="flex items-center space-x-1 cursor-pointer hover:text-blue-700 transition-colors duration-200"
                      onClick={() => toggleCommentSection(theory.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 12.75h9m-9 3h9m-13.5 4.5h9.75c1.252 0 2.25-1.5 2.25-3v-13.5c0-.621-.504-1.125-1.125-1.125h-16.5A1.125 1.125 0 004.875 4.5v16.5c1.125-1.875 2.775-3.65 4.5-4.5" />
                      </svg>
                      <span className="text-gray-600 font-medium">Comment</span>
                    </div>
                    <div className="flex items-center space-x-1 cursor-pointer hover:text-blue-700 transition-colors duration-200" onClick={() => handleShare(theory.id)}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 11.25v-6A2.25 2.25 0 0111.25 2.25h4.5a2.25 2.25 0 012.25 2.25v6" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21.75h18m-9-7.5v9" />
                      </svg>
                      <span className="text-gray-600 font-medium">Share</span>
                    </div>
                  </div>

                  {activeCommentId === theory.id && (
                    <div className="mt-2">
                      <div className="space-y-2">
                        {comments[theory.id]?.map((comment) => (
                          <div key={comment.id} className="p-2 bg-gray-100 rounded-md">
                            <strong>{comment.userDisplayName}:</strong> {comment.text}
                          </div>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={commentText}
                        onChange={handleCommentChange}
                        className="w-full p-2 border border-gray-300 rounded-md mt-2"
                        placeholder="Add a comment..."
                      />
                      <button
                        className="bg-blue-500 text-white px-4 py-2 rounded-md mt-2"
                        onClick={() => handleCommentSubmit(theory.id)}
                      >
                        Submit Comment
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </main>
        </div>

        {/* Suggested Users Section */}
        <div className="w-full max-w-xs p-4 space-y-4">
          <section className="bg-white p-4 shadow-md rounded-lg">
            <h2 className="font-bold mb-2">Suggested Users</h2>
            <ul>
              {suggestedUsers.map((user) => (
                <li key={user.id} className="flex items-center space-x-2 mb-2">
                  <img
                    src={user.photoURL || '/default-avatar.png'}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-full"
                  />
                  <span>{user.displayName}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Layout>
  );
}
