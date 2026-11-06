export default function StatusMessage({ type, children }) {
  return (
    <p className={`status status--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
