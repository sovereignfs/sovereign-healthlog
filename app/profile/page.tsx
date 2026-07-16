import { Card, PageHeader } from '@sovereignfs/ui';
import { BackLink } from '../_components/BackLink';
import { HeightSection } from '../_components/HeightSection';
import { ProfileForm } from '../_components/ProfileForm';
import { getProfile, listHeightEntries } from '../_lib/actions';
import styles from './page.module.css';

export default async function ProfilePage() {
  const [profile, heightEntries] = await Promise.all([getProfile(), listHeightEntries()]);

  return (
    <div className={styles.page}>
      <BackLink href="/healthlog">Back</BackLink>

      <PageHeader
        title="Profile"
        description="Your health profile, emergency context, and preferred units."
      />

      <Card className={styles.card}>
        <HeightSection
          entries={heightEntries}
          preferredHeightUnit={profile.preferredUnits.height}
        />
      </Card>

      <Card className={styles.card}>
        <ProfileForm profile={profile} />
      </Card>
    </div>
  );
}
