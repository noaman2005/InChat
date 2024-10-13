import Navbar from "@/components/Navbar";

export default function Layout({ children }) {
    return (
        <div className="flex">
            <Navbar />
            {/* Main content area with margin to avoid overlap with Navbar */}
            <div className="ml-20 p-6 h-full w-full">
                {children} {/* This will render the content of the page */}
            </div>
        </div>
    );
}