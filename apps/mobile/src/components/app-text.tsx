import type { ComponentProps } from "react";
import { Text as ReactNativeText } from "react-native";
import { useLocale } from "../providers/locale-provider";

type AppTextProps = ComponentProps<typeof ReactNativeText>;

export function AppText({ style, ...props }: AppTextProps) {
  const { direction } = useLocale();

  return (
    <ReactNativeText
      {...props}
      style={[
        style,
        {
          textAlign: "right",
          writingDirection: direction
        }
      ]}
    />
  );
}
