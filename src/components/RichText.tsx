import { Fragment } from "react";

/**
 * Renders a translation string where **segments** are bold.
 */
const RichText = ({ text }: { text: string }) => (
  <>
    {text.split("**").map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="text-foreground">
          {part}
        </strong>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      )
    )}
  </>
);

export default RichText;
