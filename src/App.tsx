import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/components/RequireAuth';
import { useDemoFlags } from '@/state/useDemoFlags';
import { routes } from '@/routes';
import { Kit } from '@/screens/Kit';
import { SignIn } from '@/screens/SignIn/SignIn';
import { Welcome } from '@/screens/Welcome/Welcome';
import { Home } from '@/screens/Home/Home';
import { Requests } from '@/screens/Requests/Requests';
import { History } from '@/screens/History/History';
import { Review } from '@/screens/Review/Review';
import { Credits } from '@/screens/Credits/Credits';
import { ChatStart } from '@/screens/Chat/ChatStart';
import { ChatThread } from '@/screens/Chat/ChatThread';
import { NoCredits } from '@/screens/NoCredits/NoCredits';
import { Progress } from '@/screens/Progress/Progress';
import { Preview } from '@/screens/Preview/Preview';
import { SignOff } from '@/screens/SignOff/SignOff';
import { States } from '@/screens/States/States';

export function App() {
  useDemoFlags();
  return (
    <Routes>
      <Route path={routes.kit} element={<Kit />} />
      <Route path={routes.signIn} element={<SignIn />} />
      <Route path={routes.welcome} element={<Welcome />} />

      <Route element={<RequireAuth />}>
        <Route path={routes.home} element={<Home />} />
        <Route path={routes.requests} element={<Requests />} />
        <Route path={routes.history} element={<History />} />
        <Route path={routes.credits} element={<Credits />} />
        <Route path={routes.chatStart} element={<ChatStart />} />
        <Route path={routes.thread()} element={<ChatThread />} />
        <Route path={routes.signOff()} element={<SignOff />} />
        <Route path={routes.noCredits()} element={<NoCredits />} />
        <Route path={routes.review()} element={<Review />} />
        <Route path={routes.preview()} element={<Preview />} />
        <Route path={routes.progress()} element={<Progress />} />
        <Route path={routes.states} element={<States />} />
      </Route>

      <Route path="*" element={<Navigate to={routes.home} replace />} />
    </Routes>
  );
}
