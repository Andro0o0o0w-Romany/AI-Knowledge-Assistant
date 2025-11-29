"""Tests for chat/ask endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_ask_question(client: AsyncClient, auth_headers):
    """Test asking a question."""
    response = await client.post(
        "/api/ask",
        json={"question": "What is in my documents?"},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "sources" in data
    assert "processing_time" in data
    assert data["question"] == "What is in my documents?"


@pytest.mark.asyncio
async def test_ask_question_without_auth(client: AsyncClient):
    """Test asking question without authentication fails."""
    response = await client.post(
        "/api/ask",
        json={"question": "What is in my documents?"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_ask_empty_question(client: AsyncClient, auth_headers):
    """Test asking an empty question fails validation."""
    response = await client.post(
        "/api/ask",
        json={"question": ""},
        headers=auth_headers
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_chat_history_empty(client: AsyncClient, auth_headers):
    """Test getting chat history when empty."""
    response = await client.get("/api/ask/history", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["messages"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_chat_history_after_question(client: AsyncClient, auth_headers):
    """Test chat history contains asked questions."""
    # Ask a question first
    await client.post(
        "/api/ask",
        json={"question": "Test question for history?"},
        headers=auth_headers
    )
    
    # Check history
    response = await client.get("/api/ask/history", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert any(msg["question"] == "Test question for history?" for msg in data["messages"])


@pytest.mark.asyncio
async def test_clear_chat_history(client: AsyncClient, auth_headers):
    """Test clearing chat history."""
    # Ask a question first
    await client.post(
        "/api/ask",
        json={"question": "Question to be cleared"},
        headers=auth_headers
    )
    
    # Clear history
    response = await client.delete("/api/ask/history", headers=auth_headers)
    assert response.status_code == 200
    
    # Verify history is empty
    response = await client.get("/api/ask/history", headers=auth_headers)
    data = response.json()
    assert data["total"] == 0

