import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.student import Student, VALID_GRADES
from app.db.repositories import StudentRepository
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


# --- Request / response models ---

class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str
    password_confirm: str
    grade_level: str          # "4"–"12" or "professional"


class AuthResponse(BaseModel):
    student_id: str
    name: str
    grade_level: str
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: str
    password: str


# --- Routes ---

@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(request: SignUpRequest):
    if request.password != request.password_confirm:
        raise HTTPException(status_code=422, detail="Passwords do not match.")
    if len(request.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")
    if request.grade_level not in VALID_GRADES:
        raise HTTPException(
            status_code=422,
            detail=f"grade_level must be one of: {sorted(VALID_GRADES, key=lambda x: (x.isdigit() == False, x))}",
        )

    email = request.email.strip().lower()
    repo = StudentRepository()

    if repo.get_by_email(email):
        raise HTTPException(status_code=409, detail="An account with that email already exists.")

    student_id = str(uuid.uuid4())
    student = Student(
        id=student_id,
        student_id=student_id,
        name=request.name.strip(),
        email=email,
        password_hash=hash_password(request.password),
        grade_level=request.grade_level,
    )
    repo.upsert(student.model_dump())

    token = create_access_token(student_id)
    return AuthResponse(
        student_id=student_id,
        name=student.name,
        grade_level=student.grade_level,
        access_token=token,
    )


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest):
    email = request.email.strip().lower()
    repo = StudentRepository()
    student_data = repo.get_by_email(email)

    if not student_data or not verify_password(request.password, student_data["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(student_data["student_id"])
    return AuthResponse(
        student_id=student_data["student_id"],
        name=student_data["name"],
        grade_level=student_data["grade_level"],
        access_token=token,
    )
