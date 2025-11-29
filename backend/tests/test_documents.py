"""Tests for document endpoints."""
import pytest
from httpx import AsyncClient
from io import BytesIO


@pytest.mark.asyncio
async def test_list_documents_empty(client: AsyncClient, auth_headers):
    """Test listing documents when none exist."""
    response = await client.get("/api/docs", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["documents"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_upload_txt_file(client: AsyncClient, auth_headers):
    """Test uploading a text file."""
    # Create a simple text file
    content = b"This is a test document with some content."
    files = {"files": ("test.txt", BytesIO(content), "text/plain")}
    
    response = await client.post(
        "/api/docs/upload",
        files=files,
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["successful"] == 1
    assert data["failed"] == 0
    assert len(data["documents"]) == 1
    assert data["documents"][0]["filename"] == "test.txt"


@pytest.mark.asyncio
async def test_upload_invalid_file_type(client: AsyncClient, auth_headers):
    """Test uploading an invalid file type."""
    content = b"Invalid file content"
    files = {"files": ("test.docx", BytesIO(content), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    
    response = await client.post(
        "/api/docs/upload",
        files=files,
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["successful"] == 0
    assert data["failed"] == 1


@pytest.mark.asyncio
async def test_upload_without_auth(client: AsyncClient):
    """Test uploading without authentication fails."""
    content = b"This is a test document."
    files = {"files": ("test.txt", BytesIO(content), "text/plain")}
    
    response = await client.post("/api/docs/upload", files=files)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_documents_unauthorized(client: AsyncClient):
    """Test listing documents without auth fails."""
    response = await client.get("/api/docs")
    assert response.status_code == 401

