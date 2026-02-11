import React from 'react';

const DeleteSubtaskModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Удаление подзадачи",
  confirmText = "Удалить",
  cancelText = "Отмена"
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
        <div className="modal-actions">
          <button 
            className="btn btn-danger"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
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

export default DeleteSubtaskModal;