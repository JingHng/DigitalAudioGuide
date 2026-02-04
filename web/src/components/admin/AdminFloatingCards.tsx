import React, { useEffect, useState } from 'react';
import { 
    Plus, Edit2, Trash2, Save, X, ArrowUp, ArrowDown, MousePointerClick,
    QrCode, MapPin, Sparkles, Award, Music, Image, 
    Users, Settings, Eye, Heart, Star, Bell
} from 'lucide-react';
import apiClient from '../../utils/apiClient';
import AdminLayout from './AdminLayout';
import '../../css/AdminFloatingCards.css';
import '../../css/AdminTable.css';
import '../../css/AdminComponents.css';

interface FloatingCard {
    cardId: string;
    title: string;
    icon: string;
    linkUrl: string;
    position: number;
    isActive: boolean;
}

const AVAILABLE_ICONS = [
    'QrCode', 'MapPin', 'Sparkles', 'Award', 'Music', 'Image', 
    'Users', 'Settings', 'Eye', 'Heart', 'Star', 'Bell'
];

const ICON_COMPONENTS: { [key: string]: React.ElementType } = {
    QrCode, MapPin, Sparkles, Award, Music, Image, 
    Users, Settings, Eye, Heart, Star, Bell
};

const VISITOR_ROUTES = [
    { value: '/scan', label: 'QR Scan Page' },
    { value: '/exhibitions', label: 'Exhibitions/Tours' },
    { value: '/badges', label: 'Badge Collection' },
    { value: 'custom', label: '+ Custom URL' }
];

const MAX_FLOATING_CARDS = 3;

const AdminFloatingCards: React.FC = () => {
    const [cards, setCards] = useState<FloatingCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingCard, setEditingCard] = useState<FloatingCard | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isCustomUrl, setIsCustomUrl] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        icon: 'QrCode',
        linkUrl: '/scan',
        position: 1,
        isActive: true
    });

    useEffect(() => {
        fetchCards();
        
        // Check for hash to trigger add form
        if (window.location.hash === '#add-card') {
            setShowAddForm(true);
            // Clear the hash
            window.history.replaceState(null, '', window.location.pathname);
        }
    }, []);

    const fetchCards = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/home/floating-cards');
            console.log('Floating cards response:', response.data);
            setCards(response.data);
        } catch (error: any) {
            console.error('Error fetching floating cards:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (cards.length >= MAX_FLOATING_CARDS) {
            alert(`Maximum ${MAX_FLOATING_CARDS} floating cards allowed`);
            return;
        }
        try {
            await apiClient.post('/home/floating-cards', formData);
            fetchCards();
            setShowAddForm(false);
            resetForm();
        } catch (error) {
            console.error('Error creating card:', error);
            alert('Failed to create card');
        }
    };

    const handleUpdate = async (card: FloatingCard) => {
        try {
            await apiClient.put(`/home/floating-cards/${card.cardId}`, card);
            fetchCards();
            setEditingCard(null);
        } catch (error) {
            console.error('Error updating card:', error);
            alert('Failed to update card');
        }
    };

    const handleDelete = async (cardId: string) => {
        if (!confirm('Are you sure you want to delete this card?')) return;
        
        try {
            await apiClient.delete(`/home/floating-cards/${cardId}`);
            fetchCards();
        } catch (error) {
            console.error('Error deleting card:', error);
            alert('Failed to delete card');
        }
    };

    const handleToggleActive = async (card: FloatingCard) => {
        try {
            await apiClient.put(`/home/floating-cards/${card.cardId}`, {
                ...card,
                isActive: !card.isActive
            });
            fetchCards();
        } catch (error) {
            console.error('Error toggling card:', error);
            alert('Failed to toggle card status');
        }
    };

    const moveCard = async (card: FloatingCard, direction: 'up' | 'down') => {
        const sortedCards = [...cards].sort((a, b) => a.position - b.position);
        const currentIndex = sortedCards.findIndex(c => c.cardId === card.cardId);
        
        if (direction === 'up' && currentIndex === 0) return;
        if (direction === 'down' && currentIndex === sortedCards.length - 1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        const targetCard = sortedCards[targetIndex];

        try {
            await Promise.all([
                apiClient.put(`/home/floating-cards/${card.cardId}`, {
                    ...card,
                    position: targetCard.position
                }),
                apiClient.put(`/home/floating-cards/${targetCard.cardId}`, {
                    ...targetCard,
                    position: card.position
                })
            ]);
            fetchCards();
        } catch (error) {
            console.error('Error moving card:', error);
            alert('Failed to reorder cards');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            icon: 'QrCode',
            linkUrl: '/scan',
            position: cards.length + 1,
            isActive: true
        });
        setIsCustomUrl(false);
    };

    if (loading) {
        return (
            <AdminLayout currentPath="/admin/floating-cards" breadcrumbs={[{ label: 'Clickable Elements' }]}>
                <div className="floating-cards-loading">Loading...</div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout currentPath="/admin/floating-cards" breadcrumbs={[{ label: 'Clickable Elements' }]}>
            <main className="admin-content admin-floating-cards">
                <div className="admin-table-container">
                    <div className="admin-table-header">
                        <h2 className="admin-table-title">
                            <MousePointerClick size={24} />
                            Clickable Elements
                        </h2>
                        <button 
                            className="btn btn-primary"
                            onClick={() => setShowAddForm(true)}
                        >
                            <Plus size={16} /> Add Card
                        </button>
                    </div>
                    <p className="floating-cards-subtitle">
                           <br></br>   Manage the floating cards on the homepage (Maximum {MAX_FLOATING_CARDS} cards).
                    </p>

            {/* Modal Form for Adding New Card */}
            {showAddForm && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-content">
                        <div className="modal-header">
                            <h3>Add New Clickable Element</h3>
                            <button className="modal-close-icon" onClick={() => setShowAddForm(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="form-content">
                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    placeholder="e.g., Interactive Scanning"
                                    className="modern-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Select Icon</label>
                                <div className="icon-grid-selector">
                                    {AVAILABLE_ICONS.map(iconName => (
                                        <button
                                            key={iconName}
                                            type="button"
                                            className={`icon-option ${formData.icon === iconName ? 'selected' : ''}`}
                                            onClick={() => setFormData({...formData, icon: iconName})}
                                            title={iconName}
                                        >
                                            {React.createElement(ICON_COMPONENTS[iconName] || MousePointerClick, { size: 20 })}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Link Destination</label>
                                <select
                                    value={isCustomUrl ? 'custom' : formData.linkUrl}
                                    onChange={(e) => {
                                        if (e.target.value === 'custom') {
                                            setIsCustomUrl(true);
                                            setFormData({...formData, linkUrl: ''});
                                        } else {
                                            setIsCustomUrl(false);
                                            setFormData({...formData, linkUrl: e.target.value});
                                        }
                                    }}
                                    className="modern-select"
                                >
                                    {VISITOR_ROUTES.map(route => (
                                        <option key={route.value} value={route.value}>{route.label}</option>
                                    ))}
                                </select>
                                {isCustomUrl && (
                                    <input
                                        type="text"
                                        value={formData.linkUrl}
                                        onChange={(e) => setFormData({...formData, linkUrl: e.target.value})}
                                        placeholder="Enter custom path (e.g., /my-page)"
                                        className="modern-input"
                                        style={{ marginTop: '12px' }}
                                    />
                                )}
                            </div>

                            <div className="form-group">
                                <label>Order Position</label>
                                <input
                                    type="number"
                                    value={formData.position}
                                    onChange={(e) => setFormData({...formData, position: parseInt(e.target.value)})}
                                    min="1"
                                    className="modern-input"
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowAddForm(false)}>
                                Cancel
                            </button>
                            <button className="btn-save" onClick={handleCreate}>
                                <Plus size={16} /> Create Element
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="cards-list">
                {cards.sort((a, b) => a.position - b.position).map((card) => {
                    const IconComponent = ICON_COMPONENTS[card.icon] || MousePointerClick;
                    
                    return (
                    <div key={card.cardId} className={`card-item ${!card.isActive ? 'inactive' : ''}`}>
                        {editingCard?.cardId === card.cardId ? (
                            <div className="card-edit-form">
                                <div className="form-grid">
                                    <input
                                        type="text"
                                        value={editingCard.title}
                                        onChange={(e) => setEditingCard({...editingCard, title: e.target.value})}
                                    />
                                    <div className="icon-select-wrapper">
                                        <select
                                            value={editingCard.icon}
                                            onChange={(e) => setEditingCard({...editingCard, icon: e.target.value})}
                                        >
                                            {AVAILABLE_ICONS.map(icon => (
                                                <option key={icon} value={icon}>{icon}</option>
                                            ))}
                                        </select>
                                        <div className="icon-preview-small">
                                            {React.createElement(ICON_COMPONENTS[editingCard.icon] || MousePointerClick, { size: 16 })}
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={editingCard.linkUrl}
                                        onChange={(e) => setEditingCard({...editingCard, linkUrl: e.target.value})}
                                    />
                                    <input
                                        type="number"
                                        value={editingCard.position}
                                        onChange={(e) => setEditingCard({...editingCard, position: parseInt(e.target.value)})}
                                        min="1"
                                    />
                                </div>
                                <div className="card-actions">
                                    <button 
                                        className="action-btn cancel"
                                        onClick={() => setEditingCard(null)}
                                        title="Cancel"
                                    >
                                        <X size={16} />
                                    </button>
                                    <button 
                                        className="action-btn save"
                                        onClick={() => handleUpdate(editingCard)}
                                        title="Save Changes"
                                    >
                                        <Save size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="card-content-wrapper">
                                    <div className="card-icon-preview">
                                        <IconComponent size={32} strokeWidth={1.5} />
                                    </div>
                                    <div className="card-info">
                                        <div className="card-header-row">
                                            <h3>{card.title}</h3>
                                            <span className="card-position-badge">#{card.position}</span>
                                        </div>
                                        <div className="card-meta">
                                            <span className="meta-item" title="Link URL">
                                                <MousePointerClick size={12} /> {card.linkUrl}
                                            </span>
                                            <strong className={`status-badge ${card.isActive ? 'is-active' : 'is-inactive'}`}>
                                                {card.isActive ? 'Active' : 'Hidden'}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-actions">
                                    <button 
                                        className="action-btn move"
                                        onClick={() => moveCard(card, 'up')}
                                        disabled={card.position === 1}
                                        title="Move up"
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                    <button 
                                        className="action-btn move"
                                        onClick={() => moveCard(card, 'down')}
                                        disabled={card.position === cards.length}
                                        title="Move down"
                                    >
                                        <ArrowDown size={16} />
                                    </button>
                                    <button 
                                        className="action-btn edit"
                                        onClick={() => setEditingCard(card)}
                                        title="Edit"
                                        >
                                            <Edit2 size={16} />
                                    </button>
                                    <button 
                                        className={`action-btn toggle ${card.isActive ? 'active-btn' : 'inactive-btn'}`}
                                        onClick={() => handleToggleActive(card)} 
                                        title={card.isActive ? "Hide card" : "Show card"}
                                    >
                                        {card.isActive ? <Eye size={16} /> : <Eye size={16} style={{opacity: 0.5}} />}
                                    </button>
                                    <button 
                                        className="action-btn delete"
                                        onClick={() => handleDelete(card.cardId)}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                );
                })}
            </div>

            {cards.length === 0 && (
                <div className="empty-state">
                    <MousePointerClick size={48} />
                    <h3>No Clickable Elements</h3>
                    <p>Add your first floating card to display on the homepage</p>
                </div>
            )}
                </div>
            </main>
        </AdminLayout>
    );
};

export default AdminFloatingCards;
