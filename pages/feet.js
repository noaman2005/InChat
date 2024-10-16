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
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState({});

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
      const theoriesQuery = query(theoriesCollection, orderBy('createdAt', 'desc'));
      const theoriesSnapshot = await getDocs(theoriesQuery);
      const theoriesList = await Promise.all(
        theoriesSnapshot.docs.map(async (theoryDoc) => {
          const theoryData = theoryDoc.data();
          const commentsCollection = collection(db, 'theories', theoryDoc.id, 'comments');
          const commentsQuery = query(commentsCollection, orderBy('createdAt', 'desc'));
          const commentsSnapshot = await getDocs(commentsQuery);
          const theoryComments = await Promise.all(
            commentsSnapshot.docs.map(async (commentDoc) => {
              const commentData = commentDoc.data();
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
          const userRef = doc(db, 'users', theoryData.userId);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists() ? userSnap.data() : null;
          return {
            id: theoryDoc.id,
            ...theoryData,
            userPhotoURL: userData?.photoURL || '/default-avatar.png',
            userDisplayName: userData?.displayName || 'User',
            likes: theoryData.likes || 0,
            likedBy: theoryData.likedBy || [],
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
    setActiveCommentId(activeCommentId === id ? null : id);
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
      toggleCommentSection(theoryId);
      fetchTheories();
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleLike = async (theoryId) => {
    const currentUserId = auth.currentUser.uid;
    setTheories((prevTheories) =>
      prevTheories.map((theory) => {
        if (theory.id === theoryId) {
          const likedBy = Array.isArray(theory.likedBy) ? theory.likedBy : [];
          const isLiked = likedBy.includes(currentUserId);
          return {
            ...theory,
            likes: isLiked ? theory.likes - 1 : theory.likes + 1,
            likedBy: isLiked ? likedBy.filter((id) => id !== currentUserId) : [...likedBy, currentUserId],
          };
        }
        return theory;
      })
    );

    try {
      const theoryRef = doc(db, 'theories', theoryId);
      const theoryDoc = await getDoc(theoryRef);
      const theoryData = theoryDoc.data();
      const likedBy = Array.isArray(theoryData.likedBy) ? theoryData.likedBy : [];
      const isLiked = likedBy.includes(currentUserId);
      if (isLiked) {
        await updateDoc(theoryRef, {
          likes: theoryData.likes - 1,
          likedBy: arrayRemove(currentUserId),
        });
      } else {
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
      <header className="p-4 flex items-center justify-between bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold">Feed</h1>
        <button onClick={handleSignOut} className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-4 rounded transition duration-200">
          Sign Out
        </button>
      </header>
      <div className="mt-6">
        <Navbar />
      </div>
      <div className="flex justify-center space-x-8 mt-4">
        <div className="max-w-2xl w-full p-4 bg-white rounded-lg shadow-lg">
          <main className="flex flex-col space-y-6">
            {theories.length === 0 ? (
              <p className="text-center text-gray-600">No theories submitted yet.</p>
            ) : (
              theories.map((theory) => (
                <div key={theory.id} className="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <img
                      src={theory.userPhotoURL}
                      alt={theory.userDisplayName}
                      className="w-10 h-10 rounded-full"
                    />
                    <span className="font-semibold text-gray-800">{theory.userDisplayName}</span>
                  </div>
                  <h2 className="font-bold mt-2 text-lg">{theory.title}</h2>
                  {theory.mediaUrl && (
                    <img
                      src={theory.mediaUrl}
                      alt="Theory Media"
                      className="mt-2 w-full h-auto rounded-lg max-h-80 object-cover"
                    />
                  )}
                  <p className="p-2 text-black">{theory.description}</p>
                  <div className="flex items-center justify-between mt-4 space-x-4">
                    <div
                      className={`flex items-center space-x-1 cursor-pointer transition-colors duration-200 ${theory.likedBy.includes(auth.currentUser.uid) ? 'text-red-500' : 'text-gray-600'}`}
                      onClick={() => handleLike(theory.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill={theory.likedBy.includes(auth.currentUser.uid) ? 'red' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <span>{theory.likes} Likes</span>
                    </div>
                    <div
                      className="flex items-center cursor-pointer text-gray-600"
                      onClick={() => toggleCommentSection(theory.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 15.5c0 1.66-1.34 3-3 3H7c-1.66 0-3-1.34-3-3V8c0-1.66 1.34-3 3-3h11c1.66 0 3 1.34 3 3v7.5z" />
                      </svg>
                      <span>{comments[theory.id]?.length || 0} Comments</span>
                    </div>
                    <div className="flex items-center cursor-pointer text-gray-600" onClick={() => handleShare(theory.id)}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12h6m0 0a4 4 0 00-4-4m4 4a4 4 0 01-4 4m-4-4a4 4 0 00-4-4m0 0a4 4 0 014 4m0 0a4 4 0 014 4" />
                      </svg>
                    </div>
                  </div>
                  {activeCommentId === theory.id && (
                    <div className="mt-4">
                      <textarea
                        value={commentText}
                        onChange={handleCommentChange}
                        placeholder="Add a comment..."
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                      <button
                        onClick={() => handleCommentSubmit(theory.id)}
                        className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-4 rounded transition duration-200"
                      >
                        Submit Comment
                      </button>
                      <div className="mt-2">
                        {comments[theory.id]?.map((comment) => (
                          <div key={comment.id} className="border-b border-gray-200 py-2">
                            <strong>{comment.userDisplayName}: </strong>
                            <span>{comment.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </main>
        </div>
        <div className="max-w-xs w-full p-4 bg-white rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Suggested Users</h2>
          <ul>
            {suggestedUsers.map((user) => (
              <li key={user.id} className="flex items-center mb-3 border-b border-gray-200 py-2">
                <img
                  src={user.photoURL || '/default-avatar.png'}
                  alt={user.displayName}
                  className="w-10 h-10 rounded-full mr-3"
                />
                <span className="font-semibold">{user.displayName}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
}
