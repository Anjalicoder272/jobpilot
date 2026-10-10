// A template re-renders on every navigation, so each page fades in smoothly.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
