import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { useRouter } from 'next/router';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Layout from '@/components/Layout';
import Navbar from '../components/Navbar';

export default function UserDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [userStats, setUserStats] = useState({ theories: 0, followers: 0, following: 0 });
    const [activities, setActivities] = useState([]);

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
                setUserStats({
                    theories: userDoc.data().theoriesCount || 0,
                    followers: userDoc.data().followersCount || 0,
                    following: userDoc.data().followingCount || 0,
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

            const userActivities = theoriesSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(theory => theory.userId === userId);

            setActivities(userActivities);
            setUserStats(prevStats => ({
                ...prevStats,
                theories: userActivities.length
            }));
        } catch (error) {
            console.error("Error fetching user activities:", error);
        }
    };

    const handleEditProfile = () => {
        router.push('/Edit-Profile');
    };

    const handleShareProfile = () => {
        const profileLink = `${window.location.origin}/profile/${auth.currentUser.uid}`;
        navigator.clipboard.writeText(profileLink);
        alert('Profile link copied!');
    };

    return (
        <Layout>
            <Navbar />
            <div className="max-w-3xl mx-auto p-4  text-white">
                {/* User Profile Section */}
                <div className="flex items-center space-x-6 mb-4">
                    <img
                        src={user?.photoURL || '/default-avatar.png'}
                        alt={user?.displayName || 'User'}
                        referrerPolicy="no-referrer"
                        className="w-24 h-24 p-2 rounded-full"
                    />
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-semibold">{user?.displayName}</h2>
                        <p className="text-gray-600 mb-2">{user?.bio || 'No bio available'}</p>
                        <div className="flex space-x-4 mb-2">
                            <div className="text-center">
                                <span className="block text-lg font-semibold">{userStats.theories}</span>
                                <span className="text-gray-500 text-sm">Posts</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-lg font-semibold">{userStats.followers}</span>
                                <span className="text-gray-500 text-sm">Followers</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-lg font-semibold">{userStats.following}</span>
                                <span className="text-gray-500 text-sm">Following</span>
                            </div>
                        </div>
                        <div className="flex space-x-4">
                            <button
                                onClick={handleEditProfile}
                                className="bg-blue-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-600 transition duration-200"
                            >
                                Edit Profile
                            </button>
                            <button
                                onClick={handleShareProfile}
                                className="bg-gray-100 text-gray-700 font-semibold px-4 py-2 rounded-md hover:bg-gray-200 transition duration-200"
                            >
                                Share Profile
                            </button>
                        </div>
                    </div>
                </div>
                {/* Activity Feed Section */}
                <h2 className="text-lg font-bold mb-2">Theories</h2>
                <div className="space-y-4 text-black">
                    {activities.length === 0 ? (
                        <p className="text-red-500">No theories found.</p>
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
