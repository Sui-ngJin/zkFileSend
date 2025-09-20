import { Box, VStack, Text, Icon } from "@chakra-ui/react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FiUpload } from "react-icons/fi";

interface FileUploadProps {
	selectedFile: File | null;
	onFileSelect: (file: File | null) => void;
}

export function FileUpload({ selectedFile, onFileSelect }: FileUploadProps) {
	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			if (acceptedFiles.length > 0) {
				onFileSelect(acceptedFiles[0]);
			}
		},
		[onFileSelect],
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		maxFiles: 1,
		accept: {
			"application/*": [],
			"text/*": [],
			"image/*": [],
			"video/*": [],
			"audio/*": [],
		},
	});

	const bgColor = isDragActive ? "gray.100" : "gray.200";

	return (
		<VStack gap={2} w="100%" align="start">
			<Text fontWeight="medium" fontSize="sm">
				Choose a file
			</Text>

			<Box
				{...getRootProps()}
				w="100%"
				h="140px"
				bg={bgColor}
				border="2px dashed"
				borderColor={isDragActive ? "blue.300" : "gray.300"}
				borderRadius="md"
				cursor="pointer"
				transition="all 0.2s"
				_hover={{
					borderColor: "blue.400",
					bg: "gray.100",
				}}
				display="flex"
				alignItems="center"
				justifyContent="center"
			>
				<input {...getInputProps()} />

				<VStack gap={3}>
					<Icon as={FiUpload} boxSize={8} color="gray.500" />

					{selectedFile ? (
						<VStack gap={1}>
							<Text fontWeight="medium" fontSize="sm" textAlign="center">
								{selectedFile.name}
							</Text>
							<Text fontSize="xs" color="gray.500">
								{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
							</Text>
						</VStack>
					) : (
						<Text fontSize="sm" color="gray.500" textAlign="center">
							{isDragActive
								? "Drop the file here..."
								: "Drag and drop or select a file"}
						</Text>
					)}
				</VStack>
			</Box>
		</VStack>
	);
}
