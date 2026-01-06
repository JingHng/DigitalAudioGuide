import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchExhibitReviews } from "../utils/api";
import Navbar from "../components/Navbar";
import { Footer } from "../components/Footer";

interface Review {
  feedback_id: number;
  exhibit_id: number;
  rating: number;
  description?: string;
  created_at: string;
  exhibit?: { exhibit_id: number; title: string; exhibitionId?: number };
  exhibition?: { exhibitionId: number; title: string };
}

interface ExhibitGroup {
  exhibit_id: number;
  title: string;
  reviews: Review[];
}
interface ExhibitionGroup {
  exhibitionId: number;
  title: string;
  exhibits: ExhibitGroup[];
}

const ReviewsPage: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [grouped, setGrouped] = useState<ExhibitionGroup[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.userId) return;
    setLoading(true);
    fetch(`/api/reviews/user/${user.userId}`)
      .then(res => res.json())
      .then(data => {
        const allReviews = data?.data?.reviews || [];
        setReviews(allReviews);
        setLoading(false);
      })
      .catch(err => {
        setError("Failed to fetch reviews");
        setLoading(false);
      });
  }, [user?.userId]);

  useEffect(() => {
    // Group reviews by exhibition, then exhibit
    const exhibitionMap: { [id: number]: ExhibitionGroup } = {};
    reviews.forEach(r => {
      // Try to get exhibition info from review.exhibit.exhibition or review.exhibition
      const exhibitionId = r.exhibit?.exhibitionId || r.exhibition?.exhibitionId || 0;
      const exhibitionTitle = r.exhibit?.exhibitionTitle || r.exhibition?.title || "Exhibition " + exhibitionId;
      if (!exhibitionMap[exhibitionId]) {
        exhibitionMap[exhibitionId] = {
          exhibitionId,
          title: exhibitionTitle,
          exhibits: [],
        };
      }
      let exhibitGroup = exhibitionMap[exhibitionId].exhibits.find(e => e.exhibit_id === r.exhibit_id);
      if (!exhibitGroup) {
        exhibitGroup = {
          exhibit_id: r.exhibit_id,
          title: r.exhibit?.title || "Unknown Exhibit",
          reviews: [],
        };
        exhibitionMap[exhibitionId].exhibits.push(exhibitGroup);
      }
      exhibitGroup.reviews.push(r);
    });
    // Sort exhibits within each exhibition
    Object.values(exhibitionMap).forEach(exh => {
      exh.exhibits.sort((a, b) => sortOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title));
    });
    setGrouped(Object.values(exhibitionMap));
  }, [reviews, sortOrder]);

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main style={{ flex: 1, maxWidth: 900, margin: '0 auto', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '1.2em', fontWeight: 500, color: '#007bff', marginBottom: 24 }}>You must be logged in to Review</div>
          <a href="http://localhost:5173/login" style={{ padding: '12px 32px', borderRadius: 24, background: '#007bff', color: '#fff', fontWeight: 600, fontSize: '1.08em', textDecoration: 'none', boxShadow: '0 1px 4px #ddd' }}>Login</a>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
        <h1 style={{ fontSize: '2em', fontWeight: 700, marginBottom: 24 }}>My Reviews</h1>
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontWeight: 500 }}>Sort exhibits:</span>
          <button
            onClick={() => setSortOrder('asc')}
            style={{ padding: '6px 18px', borderRadius: 20, border: 'none', background: sortOrder === 'asc' ? '#007bff' : '#eee', color: sortOrder === 'asc' ? '#fff' : '#444', fontWeight: 500, cursor: 'pointer' }}
          >A-Z</button>
          <button
            onClick={() => setSortOrder('desc')}
            style={{ padding: '6px 18px', borderRadius: 20, border: 'none', background: sortOrder === 'desc' ? '#007bff' : '#eee', color: sortOrder === 'desc' ? '#fff' : '#444', fontWeight: 500, cursor: 'pointer' }}
          >Z-A</button>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: 48 }}>Loading reviews...</div>
        ) : error ? (
          <div style={{ color: 'red', textAlign: 'center', marginTop: 48 }}>{error}</div>
        ) : grouped.length === 0 ? (
          <div style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: 48 }}>No reviews found.</div>
        ) : (
          grouped.map(exh => (
            <section key={exh.exhibitionId} style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: '1.3em', fontWeight: 600, marginBottom: 12 }}>{exh.title}</h2>
              {exh.exhibits.map(ex => (
                <div key={ex.exhibit_id} style={{ marginBottom: 24, padding: '18px 24px', background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px #eee' }}>
                  <h3 style={{ fontSize: '1.1em', fontWeight: 500, marginBottom: 8 }}>{ex.title}</h3>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {ex.reviews.map(rv => (
                      <li key={rv.feedback_id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f3f3f3' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} style={{ color: i < rv.rating ? '#FFD700' : '#ccc', fontSize: '1.1em' }}>★</span>
                          ))}
                          <span style={{ marginLeft: 8, color: '#555', fontSize: '0.95em' }}>{rv.rating} / 5</span>
                        </div>
                        {rv.description && (
                          <div style={{ marginTop: 6, padding: '8px 12px', background: '#f7f7fa', color: '#222', borderRadius: 4, fontSize: '1em', fontStyle: 'italic', border: '1px solid #eee' }}>{rv.description}</div>
                        )}
                        <div style={{ fontSize: '0.85em', color: '#aaa', marginTop: 4 }}>{rv.created_at ? new Date(rv.created_at).toLocaleString() : ''}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ReviewsPage;
