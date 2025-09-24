import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <h1 className="text-2xl font-bold mb-4">QR-Pass</h1>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link
          to="/beacon"
          className="bg-blue-600 text-white rounded p-3 text-center hover:bg-blue-700 transition"
        >
          Afficher mon QR
        </Link>
        <Link
          to="/scan"
          className="bg-green-600 text-white rounded p-3 text-center hover:bg-green-700 transition"
        >
          Scanner un QR
        </Link>
      </div>
    </div>
  );
};

export default Home;
