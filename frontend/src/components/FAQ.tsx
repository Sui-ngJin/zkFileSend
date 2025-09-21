import { useState } from "react";
import styles from "./FAQ.module.css";

interface FAQItem {
	question: string;
	answer: string;
}

interface FAQProps {
	accentColor?: string; // 기본값은 Send 페이지용 파란색
}

const faqData: FAQItem[] = [
	{
		question: "What is zkFileSend?",
		answer:
			"zkFileSend is an end-to-end encrypted file transfer system built on the Sui blockchain. Only the sender and the authorized receiver can access the file — no one else can see it, not even Sui blockchain validators.",
	},
	{
		question: "Why do we need this?",
		answer:
			"Hacks targeting customer data — and even unauthorized surveillance by tech companies — are still happening today. For confidential files, use an end-to-end encrypted file transfer system where only the sender and the authorized receiver can access the data.",
	},
	{
		question: "How it works?",
		answer:
			"zkFileSend runs on the Sui blockchain, leveraging Walrus, Seal, zkLogin, and zkSend to enable fully end-to-end encrypted file transfers. Files are encrypted so that only the authorized receiver chosen by the sender can open and download them after passing an access check.",
	},
	{
		question: "What is Sui?",
		answer:
			"Sui is a high-performance Layer 1 blockchain designed for speed, scalability, and security. It enables flexible asset policies and efficient on-chain data storage, making it ideal for applications that require reliable and secure state management. Its architecture supports fast finality and low-latency transactions, ensuring a smooth user experience.",
	},
	{
		question: "What are Walrus and Seal?",
		answer:
			"Walrus and Seal are Sui-based storage solutions that make it simple and reliable to store and retrieve data on-chain. They leverage Sui’s fast and secure architecture to ensure data integrity and availability while keeping costs low. Together, they provide a flexible way to manage and access files, making them well-suited for end-to-end encrypted file transfers.",
	},
  {
    question: "What are zkLogin and zkSend?",
    answer:
      "zkLogin and zkSend bring privacy and a seamless user experience to Sui. zkLogin allows users to authenticate with familiar Web2 credentials (like Google) without compromising security, while zkSend lets users send assets with a simple link — no wallet setup required. Both leverage zero-knowledge proofs and Sui’s high-performance network to keep the process secure and smooth for end-to-end encrypted file transfers.",
  },
  {
    question: "Does zkFileSend charge a fee?",
    answer:
      "Not now. When the sender encrypts a file and uploads it to Walrus, zkFileSend will charge a fee equal to 10% of the total encryption and upload cost.",
  },

];

export function FAQ({ accentColor = '#02bbff' }: FAQProps = {}) {
	const [expandedIndex, setExpandedIndex] = useState<number>(-1); // 첫 번째 항목이 기본 확장

	const toggleExpand = (index: number) => {
		setExpandedIndex(expandedIndex === index ? -1 : index);
	};

	return (
		<div className={styles.faqContainer}>
			<div className={styles.faqTitle}>FAQs</div>
			<div className={styles.faqList}>
				{faqData.map((item, index) => (
					<div key={index} className={styles.faqItem}>
						<div
							className={styles.faqQuestion}
							onClick={(e) => {
								e.preventDefault();
								toggleExpand(index);
							}}
						>
							<div className={styles.questionText}>{item.question}</div>
							<div className={styles.iconWrapper}>
								{expandedIndex === index ? (
									// Minus icon (expanded)
									<div className={styles.minusIcon} style={{ backgroundColor: accentColor }} />
								) : (
									// Plus icon (collapsed)
									<div className={styles.plusIconContainer}>
										<div className={styles.plusIconH} style={{ backgroundColor: accentColor }} />
										<div className={styles.plusIconV} style={{ backgroundColor: accentColor }} />
									</div>
								)}
							</div>
						</div>
						{expandedIndex === index && (
							<div className={styles.faqAnswer}>{item.answer}</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
