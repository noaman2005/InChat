import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { useRouter } from 'next/router';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Layout from '@/components/Layout';
import Navbar from '../components/Navbar';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseStorage } from '../lib/firebase'; // Ensure this is correctly imported

export default function UserDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [userStats, setUserStats] = useState({ theories: 0, followers: 0, following: 0 });
    const [activities, setActivities] = useState([]);
    const [bio, setBio] = useState('');
    const [file, setFile] = useState(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (!user) {
                router.push('/login');
            } else {
                setLoading(false);
                fetchUserData(user.uid);
                fetchUserActivities(user.uid);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const fetchUserData = async (userId) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                setUser(userDoc.data());
                setBio(userDoc.data().bio || ''); // Set the initial bio state
                setUserStats({
                    theories: userDoc.data().theoriesCount || 0,
                    followers: userDoc.data().followersCount || 0,
                    following: userDoc.data().followingCount || 0
                });
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
        }
    };

    const fetchUserActivities = async (userId) => {
        try {
            const theoriesCollection = collection(db, 'theories');
            const theoriesSnapshot = await getDocs(theoriesCollection);

            // Filter activities for the logged-in user
            const userActivities = theoriesSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(theory => theory.userId === userId);

            // Set the activities and dynamically count theories
            setActivities(userActivities);
            setUserStats(prevStats => ({
                ...prevStats,
                theories: userActivities.length // Dynamically count user's theories
            }));
        } catch (error) {
            console.error("Error fetching user activities:", error);
        }
    };

    const handleBioChange = (e) => {
        setBio(e.target.value);
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpdateProfile = async () => {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const updates = { bio };

        if (file) {
            const storageRef = ref(firebaseStorage, `/profilePics/${auth.currentUser.uid}`);
            await uploadBytes(storageRef, file);
            const photoURL = await getDownloadURL(storageRef);
            updates.photoURL = photoURL; // Add photoURL to updates
        }

        await updateDoc(userRef, updates);
        setUser(prev => ({ ...prev, bio, photoURL: updates.photoURL || prev.photoURL }));
        setFile(null); // Reset file after uploading
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Layout>
            <header className="p-2 flex items-center justify-between m-2">
                <h1 className="text-2xl font-bold text-white">User Dashboard</h1>
            </header>
            <hr className="border-t border-gray-300 mb-6 w-full" />
            <Navbar />
            <div className="max-w-3xl mx-auto p-4 bg-white shadow-md rounded-lg">
                {/* User Profile Section */}
                <div className="flex items-center space-x-4 mb-4">
                    <img src={user?.photoURL || '/default-avatar.png'} alt={user?.displayName} className="w-20 h-20 rounded-full" />
                    <div>
                        <h2 className="text-xl font-bold">{user?.displayName}</h2>
                        <textarea
                            value={bio}
                            onChange={handleBioChange}
                            className="border rounded-lg p-2 w-full mt-2"
                            placeholder="Update your bio..."
                        />
                        <input type="file" onChange={handleFileChange} className="mt-2" />
                        <button onClick={handleUpdateProfile} className="mt-2 bg-blue-500 text-white rounded-lg px-4 py-2">
                            Update Profile
                        </button>
                        <div className="flex space-x-4 mt-2">
                            <span>{userStats.theories} Theories</span>
                            <span>{userStats.followers} Followers</span>
                            <span>{userStats.following} Following</span>
                        </div>
                    </div>
                </div>

                {/* Activity Feed Section */}
                <h2 className="text-lg font-bold mb-2">Recent Activities</h2>
                <div className="space-y-4">
                    {activities.length === 0 ? (
                        <p>No recent activities found.</p>
                    ) : (
                        activities.map(activity => (
                            <div key={activity.id} className="p-4 bg-gray-100 rounded-lg shadow">
                                <h3 className="font-semibold">{activity.title}</h3>
                                <p>{activity.description}</p>
                                {activity.mediaUrl && (
                                    <img src={activity.mediaUrl} alt="Activity Media" className="mt-2 w-full h-auto rounded-lg" />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Layout>
    );
}
