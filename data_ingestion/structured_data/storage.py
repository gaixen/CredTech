from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config import Config
from models import Base

if Config.DB_URL.startswith("sqlite"):  # thread safety for test runs
    engine = create_engine(Config.DB_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(Config.DB_URL)
SessionLocal = sessionmaker(bind=engine)

# Create tables if not exist
def init_db():
    Base.metadata.create_all(bind=engine)

# Example save function
def save_financial_statement(session, statement):
    session.add(statement)
    session.commit()

def save_stock_price(session, price):
    session.add(price)
    session.commit()

def save_company_fundamentals(session, fundamentals):
    session.add(fundamentals)
    session.commit()

def save_economic_indicator(session, indicator):
    session.add(indicator)
    session.commit()

def save_credit_rating(session, rating):
    session.add(rating)
    session.commit()

def save_regulatory_filing(session, filing):
    session.add(filing)
    session.commit()

def get_by_id(session, model, id):
    return session.query(model).filter(model.id == id).first()

def list_all(session, model):
    return session.query(model).all()
