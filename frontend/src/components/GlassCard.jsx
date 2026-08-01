export default function GlassCard({ children, className = '', ...rest }) {
  return (
    <div className={`glass-panel card ${className}`} {...rest}>
      {children}
    </div>
  );
}
