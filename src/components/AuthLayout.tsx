import React from 'react';

export interface AuthLayoutProps {
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  subtitle,
  children,
  footer,
}) => {
  return (
    <div style={styles.container}>
      <main style={styles.card}>
        <header style={styles.header}>
          <h1 style={styles.wordmark}>SiteBrief</h1>
          {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
        </header>
        <div style={styles.content}>{children}</div>
        {footer ? <footer style={styles.footer}>{footer}</footer> : null}
      </main>
    </div>
  );
};

export default AuthLayout;

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100dvh',
    backgroundColor: '#F8F9FA',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 'max(16px, env(safe-area-inset-top))',
    paddingRight: 'max(16px, env(safe-area-inset-right))',
    paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
    paddingLeft: 'max(16px, env(safe-area-inset-left))',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    backgroundColor: '#FFFFFF',
    maxWidth: '420px',
    width: '100%',
    padding: '32px 24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  wordmark: {
    color: '#1A5276',
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    padding: 0,
    lineHeight: 1.2,
  },
  subtitle: {
    color: '#6C757D',
    fontSize: '14px',
    marginTop: '8px',
    marginBottom: 0,
    lineHeight: 1.4,
  },
  content: {
    width: '100%',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
  },
};
