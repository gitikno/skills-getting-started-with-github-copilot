from fastapi.testclient import TestClient

from src.app import app


def test_unregister_participant_removes_email_from_activity():
    client = TestClient(app)

    response = client.post("/activities/Chess Club/signup?email=newstudent@mergington.edu")
    assert response.status_code == 200

    unregister_response = client.delete("/activities/Chess Club/unregister?email=newstudent@mergington.edu")

    assert unregister_response.status_code == 200
    assert unregister_response.json()["message"] == "Removed newstudent@mergington.edu from Chess Club"

    activities_response = client.get("/activities")
    assert "newstudent@mergington.edu" not in activities_response.json()["Chess Club"]["participants"]
