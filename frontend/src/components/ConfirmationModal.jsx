import React from 'react';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onSecondaryConfirm,
  title, 
  message,
  confirmText = "Удалить",
  secondaryText = "Все начиная с этого дня",
  cancelText = "Отмена",
  type = "danger"
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-body">
          <p style={{whiteSpace: 'pre-line'}}>{message}</p>
        </div>
        <div className="modal-actions">
          <button 
            className={`btn btn-${type}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          
          {secondaryText && (
            <button 
              className={`btn btn-${type}`}
              onClick={onSecondaryConfirm}
            >
              {secondaryText}
            </button>
          )}

          <button 
            className="btn btn-secondary"
            onClick={onClose}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;