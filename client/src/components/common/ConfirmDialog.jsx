import Modal from "./Modal.jsx";
import Button from "./Button.jsx";

export default function ConfirmDialog({ open, title = "Are you sure?", message, onCancel, onConfirm, confirmText = "Confirm", danger = false }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} footer={
      <>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmText}</Button>
      </>
    }>
      <p className="text-sm text-neutral-700">{message}</p>
    </Modal>
  );
}
