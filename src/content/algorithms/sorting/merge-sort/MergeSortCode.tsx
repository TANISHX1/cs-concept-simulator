export default function MergeSortCode() {
  return (
    <pre className="logic-code">
        <span className="code-keyword">void</span>{" "}
        <span className="code-function">mergeSort</span>(
        <span className="code-keyword">int</span>{" "}
        <span className="code-variable">array</span>[],{" "}
        <span className="code-keyword">int</span>{" "}
        <span className="code-variable">start</span>,{" "}
        <span className="code-keyword">int</span>{" "}
        <span className="code-variable">end</span>) &#123;{"\n  "}
        <span className="code-keyword">if</span> (
        <span className="code-variable">end</span> -{" "}
        <span className="code-variable">start</span> &lt;={" "}
        <span className="code-number">1</span>){" "}
        <span className="code-keyword">return</span>;
        {"\n\n  "}
        <span className="code-keyword">int</span>{" "}
        <span className="code-variable">middle</span> = (
        <span className="code-variable">start</span> +{" "}
        <span className="code-variable">end</span>) /{" "}
        <span className="code-number">2</span>;
        {"\n  "}
        <span className="code-function">mergeSort</span>(
        <span className="code-variable">array</span>,{" "}
        <span className="code-variable">start</span>,{" "}
        <span className="code-variable">middle</span>);
        {"\n  "}
        <span className="code-function">mergeSort</span>(
        <span className="code-variable">array</span>,{" "}
        <span className="code-variable">middle</span>,{" "}
        <span className="code-variable">end</span>);
        {"\n  "}
        <span className="code-function">merge</span>(
        <span className="code-variable">array</span>,{" "}
        <span className="code-variable">start</span>,{" "}
        <span className="code-variable">middle</span>,{" "}
        <span className="code-variable">end</span>);
        {"\n"}&#125;
    </pre>
  );
}
