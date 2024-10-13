import { useEffect, useRef, useState } from 'react';
import { auth, db } from '../lib/firebase'; // Firebase config
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Layout from '../components/Layout'; // Import Layout
import { useRouter } from 'next/router';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [formValue, setFormValue] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [users, setUsers] = useState([]);
  const dummy = useRef();
  const router = useRouter();

  // Check for authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch users for chat
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersArray = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (doc.id !== user.uid) {
          usersArray.push({ uid: doc.id, ...data });
        }
      });
      setUsers(usersArray);
    });

    return () => unsubscribe();
  }, [user]);

  const selectUser = (selectedUser) => {
    if (!user) return;

    router.push(`/chat/${selectedUser.uid}`); // Navigate to chat room
  };

  if (!user) return <p className="text-center text-xl">Loading...</p>;

  return (
    <Layout>
      <header className=" p-2  flex items-center justify-between m-2">
        <h1 className="text-2xl font-bold text-white">Messages</h1>
      </header>
      <hr className="border-t border-gray-300 mb-6 w-full" />

      <div className="space-y-2 p-2">
        {users.map((userItem) => (
          <div
            key={userItem.uid}
            className={`p-3 bg-white rounded-2xl flex items-center shadow-md hover:bg-blue-200 cursor-pointer transition duration-200`}
            onClick={() => selectUser(userItem)}
          >
            <img src={userItem.photoURL || '/default-avatar.png'} alt="Avatar" className="w-10 h-10 rounded-full mr-2" />
            <span className="ml-5 text-gray-800">{userItem.displayName}</span>
          </div>
        ))}
      </div>

    </Layout>
  );
}
