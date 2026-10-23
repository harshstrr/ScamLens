from pydantic import BaseModel, ConfigDict, EmailStr, Field
class GoogleSignInRequest(BaseModel):
    id_token: str = Field(min_length=20, max_length=12000)
 
class RefreshToken(BaseModel):
    secret_key: str = Field(min_length=20, max_length=12000)
    
    
class AccountOut(BaseModel):
    id: str
    email: EmailStr
    display_name: str | None = None
    picture_url: str | None = None
    model_config = ConfigDict(from_attributes=True)
    
class AuthResponse(BaseModel):
    access_token: str
    secret_key: str
    expires_in: int
    secret_key_expires_in: int
    user: AccountOut
