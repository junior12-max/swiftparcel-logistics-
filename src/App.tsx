import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import BookShipment from '@/components/BookShipment';
import Services from '@/components/Services';
import Footer from '@/components/Footer';
import Admin from '@/components/Admin';
import { CurrencyProvider } from '@/lib/currency';

function App() {
  const [trackRequest, setTrackRequest] = useState<string | null>(null);
  const [route, setRoute] = useState(window.location.pathname + window.location.hash);

  useEffect(() => {
    const update = () => setRoute(window.location.pathname + window.location.hash);
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);

  const handleTrackRequest = (code: string) => {
    setTrackRequest(code);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (route === '/admin' || route === '#admin' || route.endsWith('/#admin')) {
    return <Admin />;
  }

  return (
    <CurrencyProvider>
      <div className="min-h-screen bg-white">
        <Navbar />
        <main>
          <Hero trackRequest={trackRequest} onTrackConsumed={() => setTrackRequest(null)} />
          <BookShipment onTrackRequest={handleTrackRequest} />
          <Services />
        </main>
        <Footer />
      </div>
    </CurrencyProvider>
  );
}

export default App;
