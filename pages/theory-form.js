import Navbar from '../components/Navbar'; // Adjust this path if needed
import TheoryForm from '../components/TheoryForm';

const TheorySubmissionPage = () => {
    return (
        <div className="flex">
            <Navbar />
            <div className="flex-grow">
                <TheoryForm />
            </div>
        </div>
    );
};

export default TheorySubmissionPage;
