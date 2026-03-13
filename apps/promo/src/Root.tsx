import { Composition, Still } from "remotion";
import { DivingAnalyticsCommercial, type CommercialProps } from "./commercial/DivingAnalyticsCommercial";
import { DivingAnalyticsPoster } from "./commercial/DivingAnalyticsPoster";

const defaultProps: CommercialProps = {
  title: "Diving Analytics",
  subtitle: "Competition intelligence for intake, performance review, and technical profiling.",
};

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="DivingAnalyticsCommercial"
        component={DivingAnalyticsCommercial}
        durationInFrames={1680}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />
      <Still
        id="DivingAnalyticsPoster"
        component={DivingAnalyticsPoster}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />
    </>
  );
};
