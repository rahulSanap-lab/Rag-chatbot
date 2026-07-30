import os
from typing import List, Tuple
from pypdf import PdfReader
import docx
import pdfplumber
from PIL import Image

class DocumentExtractor:
    @staticmethod
    def extract_text_by_pages(filepath: str, filetype: str) -> Tuple[List[Tuple[int, str]], int]:
        """
        Extracts text page by page.
        Returns: (List of (page_number, text_content), total_pages)
        """
        ext = filetype.lower()
        if ext == "pdf":
            return DocumentExtractor._extract_pdf(filepath)
        elif ext in ["docx", "doc"]:
            return DocumentExtractor._extract_docx(filepath)
        elif ext in ["txt", "md", "markdown"]:
            return DocumentExtractor._extract_plain_text(filepath)
        else:
            raise ValueError(f"Unsupported file format: {filetype}")

    @staticmethod
    def _extract_pdf(filepath: str) -> Tuple[List[Tuple[int, str]], int]:
        pages_content = []
        try:
            reader = PdfReader(filepath)
            total_pages = len(reader.pages)
            
            for idx, page in enumerate(reader.pages):
                page_num = idx + 1
                text = page.extract_text() or ""
                
                # Check if page might be a scanned PDF page with low/no text
                if len(text.strip()) < 20:
                    ocr_text = DocumentExtractor._try_ocr_pdf_page(filepath, page_num)
                    if ocr_text and len(ocr_text.strip()) > len(text.strip()):
                        text = ocr_text
                
                if text.strip():
                    pages_content.append((page_num, text.strip()))
                    
            if not pages_content:
                # Try fallback pdfplumber for full document extraction
                with pdfplumber.open(filepath) as pdf:
                    total_pages = len(pdf.pages)
                    for idx, page in enumerate(pdf.pages):
                        p_num = idx + 1
                        t = page.extract_text() or ""
                        if t.strip():
                            pages_content.append((p_num, t.strip()))
                            
            return pages_content, max(total_pages, 1)
        except Exception as e:
            # Fallback with pdfplumber if pypdf fails
            try:
                with pdfplumber.open(filepath) as pdf:
                    total_pages = len(pdf.pages)
                    for idx, page in enumerate(pdf.pages):
                        t = page.extract_text() or ""
                        if t.strip():
                            pages_content.append((idx + 1, t.strip()))
                return pages_content, max(total_pages, 1)
            except Exception as e2:
                raise RuntimeError(f"Failed to extract PDF content: {str(e2)}")

    @staticmethod
    def _try_ocr_pdf_page(filepath: str, page_num: int) -> str:
        """Attempt OCR on scanned PDF page if pytesseract is available."""
        try:
            import pytesseract
            with pdfplumber.open(filepath) as pdf:
                if page_num <= len(pdf.pages):
                    page = pdf.pages[page_num - 1]
                    img = page.to_image(resolution=150).original
                    text = pytesseract.image_to_string(img)
                    return text
        except Exception:
            pass
        return ""

    @staticmethod
    def _extract_docx(filepath: str) -> Tuple[List[Tuple[int, str]], int]:
        try:
            doc = docx.Document(filepath)
            paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
            full_text = "\n\n".join(paragraphs)
            
            # DOCX does not natively store page breaks reliably; split every ~500 words per page estimation
            words = full_text.split()
            page_size_words = 400
            pages_content = []
            
            if not words:
                return [], 1
                
            total_pages = max(1, (len(words) + page_size_words - 1) // page_size_words)
            for i in range(total_pages):
                page_words = words[i * page_size_words : (i + 1) * page_size_words]
                pages_content.append((i + 1, " ".join(page_words)))
                
            return pages_content, total_pages
        except Exception as e:
            raise RuntimeError(f"Failed to extract DOCX text: {str(e)}")

    @staticmethod
    def _extract_plain_text(filepath: str) -> Tuple[List[Tuple[int, str]], int]:
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
                
            words = text.split()
            page_size_words = 400
            
            if not words:
                return [], 1
                
            total_pages = max(1, (len(words) + page_size_words - 1) // page_size_words)
            pages_content = []
            for i in range(total_pages):
                page_words = words[i * page_size_words : (i + 1) * page_size_words]
                pages_content.append((i + 1, " ".join(page_words)))
                
            return pages_content, total_pages
        except Exception as e:
            raise RuntimeError(f"Failed to extract text file: {str(e)}")
