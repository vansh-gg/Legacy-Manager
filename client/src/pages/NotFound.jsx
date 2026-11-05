import { Button } from '../components/ui.jsx';
import { AuthCard } from '../components/PublicLayout.jsx';

export default function NotFound() {
  return (
    <AuthCard title="We could not find that page" intro="The address may be mistyped, or the page may have moved.">
      <Button to="/" size="lg" className="w-full">Go to the start page</Button>
    </AuthCard>
  );
}
