import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="mb-2 flex size-16 animate-bounce items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg [animation-duration:2s]">
        <Compass size={30} />
      </span>
      <p className="bg-gradient-to-r from-brand-600 to-violet-500 bg-clip-text text-7xl font-extrabold text-transparent">404</p>
      <h1 className="text-xl font-bold">Page not found</h1>
      <p className="text-sm text-muted">The page you are looking for does not exist.</p>
      <Link to="/dashboard" className="btn btn-primary mt-2">
        <ArrowLeft size={16} /> Go to the dashboard
      </Link>
    </div>
  );
}
