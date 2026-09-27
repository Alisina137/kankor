import type { ComponentProps } from "react";
import { StyleSheet, Text as ReactNativeText } from "react-native";
import { useLocale } from "../providers/locale-provider";

type AppTextProps = ComponentProps<typeof ReactNativeText>;

export function AppText({ style, ...props }: AppTextProps) {
  const { direction } = useLocale();
  const align = direction === "rtl" ? "right" : "left";
  const incomingStyle = StyleSheet.flatten(style);
  const isDirectionalContent = Boolean(
    incomingStyle?.textAlign === align &&
    incomingStyle?.writingDirection === direction
  );

  return (
    <ReactNativeText
      {...props}
      style={[
        {
          textAlign: align,
          writingDirection: direction
        },
        isDirectionalContent
          ? {
              width: "100%",
              maxWidth: "100%"
            }
          : null,
        style
      ]}
    />
  );
}
