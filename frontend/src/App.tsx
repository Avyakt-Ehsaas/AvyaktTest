import { BrowserRouter, Route, Routes } from "react-router-dom";
import { FlowProvider } from "./store";
import { AdminDashboard } from "./admin/AdminDashboard";

import { LandingScreen } from "./screens/LandingScreen";
import { ConsentScreen } from "./screens/ConsentScreen";
import { SelfReportScreen } from "./screens/SelfReportScreen";
import { CheckInScreen } from "./screens/CheckInScreen";
import { InstructionsScreen } from "./screens/InstructionsScreen";
import { TestScreen } from "./screens/TestScreen";
import { InterruptedScreen } from "./screens/InterruptedScreen";
import { PreResultsScreen } from "./screens/PreResultsScreen";
import { GuidedSessionScreen } from "./screens/GuidedSessionScreen";
import { PostResultsScreen } from "./screens/PostResultsScreen";
import { ThankYouScreen } from "./screens/ThankYouScreen";

export default function App() {
  return (
    <FlowProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/test" element={<LandingScreen />} />
          <Route path="/consent" element={<ConsentScreen />} />
          <Route path="/self-report" element={<SelfReportScreen />} />
          <Route path="/checkin/:phase" element={<CheckInScreen />} />
          <Route path="/instructions" element={<InstructionsScreen />} />
          <Route path="/run/:phase" element={<TestScreen />} />
          <Route path="/interrupted" element={<InterruptedScreen />} />
          <Route path="/results/pre" element={<PreResultsScreen />} />
          <Route path="/guided" element={<GuidedSessionScreen />} />
          <Route path="/results/post" element={<PostResultsScreen />} />
          <Route path="/done" element={<ThankYouScreen />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Routes>
      </BrowserRouter>
    </FlowProvider>
  );
}
