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
      <header className="p-4 flex  m-2">
        <h1 className="text-2xl font-bold text-white">Feed</h1>
      </header>
      <hr className="border-gray-300 w-full" />
      <div className="flex mt-6">
        <Navbar />
        <main className="flex-grow max-w-2xl p-4 mx-auto">
          {theories.length === 0 ? (
            <p className="text-center text-gray-600">No theories submitted yet.</p>
          ) : (
            theories.map((theory) => (
              <div key={theory.id} className="bg-white p-4 rounded-lg shadow-md mb-4 transition-shadow duration-300 hover:shadow-lg">
                <div className="flex items-center mb-2">
                  <img
                    src={theory.userPhotoURL}
                    alt={theory.userDisplayName}
                    className="w-10 h-10 rounded-full mr-2"
                  />
                  <span className="font-semibold">{theory.userDisplayName}</span>
                </div>
                <h2 className="font-bold text-lg">{theory.title}</h2>
                {theory.mediaUrl && (
                  <img
                    src={theory.mediaUrl}
                    alt="Theory Media"
                    className="mt-2 w-full h-auto rounded-lg max-h-80 object-cover"
                  />
                )}
                <p className="text-gray-800 mt-2">{theory.description}</p>
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
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                    <span>{comments[theory.id]?.length || 0} Comments</span>
                  </div>
                  <div className="flex items-center cursor-pointer text-gray-600" onClick={() => handleShare(theory.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                    </svg>
                  </div>
                </div>
                {activeCommentId === theory.id && (
                  <div className="mt-4">
                    <textarea
                      value={commentText}
                      onChange={handleCommentChange}
                      rows="3"
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      placeholder="Add a comment..."
                    />
                    <button
                      onClick={() => handleCommentSubmit(theory.id)}
                      className="mt-2 bg-blue-500 hover:bg-blue-600 text-white py-1 px-4 rounded transition duration-200"
                    >
                      Submit
                    </button>
                    <div className="mt-2">
                      {comments[theory.id]?.map((comment) => (
                        <div key={comment.id} className="flex items-start space-x-2 mb-2">
                          <span className="font-semibold">{comment.userDisplayName}</span>
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
        <aside className="w-1/3 p-4">
          <h2 className="font-bold text-white text-lg">Suggested Users</h2>
          <ul className="mt-2 space-y-2">
            {suggestedUsers.map((user) => (
              <li key={user.id} className="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <img src={user.photoURL || '/default-avatar.png'} alt={user.displayName} className="w-8 h-8 rounded-full" />
                <span className="font-semibold">{user.displayName}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </Layout>
  );
}
